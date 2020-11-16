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
        lastComposingResolver(sender.tab.id);
      lastComposingResolver = null;
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

  const details = {
    subject: String(definition.subject || '').trim(),
    body:    String(definition.body || '').trim()
  };

  if (!details.subject &&
      (definition.subjectPrefix || definition.subjectSuffix))
    details.subject = `${definition.subjectPrefix || ''}${message.subject}${definition.subjectSuffix || ''}`.trim();

  const myAddress        = 'myaddress@example.com';
  const myAddressWrapped = `<${myAddress}>`;

  switch (definition.recipients) {
    case Constants.RECIPIENTS_ALL:
      details.to = [
        message.author,
        ...message.recipients
          .filter(recipient => recipient == myAddress || recipient.endsWith(myAddressWrapped))];
      details.cc = message.ccList;
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

  console.log('begin forwared ', details);

  const composeTabId = await new Promise((resolve, _reject) => {
    lastComposingResolver = resolve;
    browser.compose.beginForward(message.id, 'forwardAsAttachment', details)
  });

  // We need to set details again because a composition window for a forwarded
  // message is always started with built-in format subject.
  console.log('set details ', details);
  browser.compose.setComposeDetails(composeTabId, details);
}
