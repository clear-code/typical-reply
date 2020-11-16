/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log
} from '/common/common.js';
import * as Constants from '/common/constants.js';

let lastComposingResolver;

browser.runtime.onMessage.addListener((message, sender) => {
  switch (message && message.type) {
    case Constants.TYPE_COMPOSE_STARTED:
      log('TYPE_COMPOSE_STARTED received ', message, sender);
      if (lastComposingResolver)
        browser.compose.getComposeDetails(sender.tab.id).then(async details => {
          lastComposingResolver({ tabId: sender.tab.id, details });
          lastComposingResolver = null;
        });
      break;
  }
});
browser.composeScripts.register({
  js: [
    // This sends a Constants.TYPE_COMPOSE_STARTED message on load.
    { file: '/resources/compose.js' }
  ]
});

browser.runtime.onMessage.addListener((message, _sender) => {
  switch (message && message.type) {
    case Constants.TYPE_DO_BUTTON_COMMAND:
      doButtonCommand(message.id).catch(console.error);
      break;
  }
});

async function doButtonCommand(id) {
  const definition = (configs.buttons || []).find(definition => definition.id == id);
  log(`doButtonCommand: ${id}`, definition);
  if (!definition)
    return;

  const tabs = await browser.mailTabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT });
  if (tabs.length == 0)
    return;

  const tab     = tabs[0];
  const message = await browser.messageDisplay.getDisplayedMessage(tab.id);

  const composeInfo = await new Promise((resolve, _reject) => {
    lastComposingResolver = resolve;
    const detailsOnForward = {
      body: String(definition.body || '').trim()
    };
    console.log('begin forwared ', detailsOnForward);
    browser.compose.beginForward(message.id, 'forwardAsAttachment', detailsOnForward)
  });

  // We need to set details after the composition window is opened,
  // because some details (ex. subject) are ignored for forwarded mails.

  const details = {
    subject: String(definition.subject || '').trim()
  };

  if (!details.subject &&
      (definition.subjectPrefix || definition.subjectSuffix))
    details.subject = `${definition.subjectPrefix || ''}${message.subject}${definition.subjectSuffix || ''}`.trim();

  const myAddress        = await getAddressFromIdentity(composeInfo.details.identityId);
  const myAddressWrapped = `<${myAddress}>`;
  log('myAddress ', myAddress);

  switch (definition.recipients) {
    case Constants.RECIPIENTS_ALL:
      details.to = [
        message.author,
        ...message.recipients
          .filter(recipient => recipient == myAddress || recipient.endsWith(myAddressWrapped))];
      details.cc = message.ccList.filter(recipient => recipient == myAddress || recipient.endsWith(myAddressWrapped));
      break;

    case Constants.RECIPIENTS_SENDER:
      details.to = [message.author];
      break;

    case Constants.RECIPIENTS_BLANK:
      details.to = [];
      break;

    default:
      details.to = String(definition.recipients || '').map(address => address.trim()).filter(address => !!address);
      break;
  }

  console.log('set details ', details);
  browser.compose.setComposeDetails(composeInfo.tabId, details);
}

async function getAddressFromIdentity(id) {
  const accounts = await browser.accounts.list();
  for (const account of accounts) {
    for (const identity of account.identities) {
      if (identity.id == id)
        return identity.email;
    }
  }
  return null;
}
