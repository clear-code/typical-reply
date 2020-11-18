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
import * as MessageBody from '/extlib/messageBody.js';

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

  const composeInfo = await new Promise(async (resolve, _reject) => {
    lastComposingResolver = resolve;
    const details = {};
    switch (definition.forwardType) {
      case 'attachment':
        console.log('begin forwared as attachment ', details);
        browser.compose.beginForward(message.id, 'forwardAsAttachment', details);
        break;

      case 'inline':
        console.log('begin forwared inline ', details);
        browser.compose.beginForward(message.id, 'forwardInline', details);
        break;

      default:
        console.log('begin reply ', details);
        switch (definition.recipients) {
          case Constants.RECIPIENTS_ALL:
            browser.compose.beginReply(message.id, 'replyToAll', details);
            break;

          case Constants.RECIPIENTS_SENDER:
            browser.compose.beginReply(message.id, 'replyToSender', details);
            break;

          default:
            browser.compose.beginReply(message.id, 'replyToSender', details);
            break;
        }
        break;
    }
  });

  // We need to set details after the composition window is opened,
  // because some details (ex. subject) are ignored for forwarded mails.

  const details = {
    subject: String(definition.subject || '').trim()
  };

  if (!details.subject &&
      (definition.subjectPrefix || definition.subjectSuffix))
    details.subject = `${definition.subjectPrefix || ''}${message.subject}${definition.subjectSuffix || ''}`.trim();

  switch (definition.recipients) {
    case Constants.RECIPIENTS_ALL:
    case Constants.RECIPIENTS_SENDER:
      break;

    case Constants.RECIPIENTS_BLANK:
      details.to = [];
      break;

    default: {
      const recipients = Array.isArray(definition.recipients) ? definition.recipients : [String(definition.recipients || '')];
      details.to = recipients.map(address => address.trim()).filter(address => !!address);
    }; break;
  }

  log('set details ', details);
  browser.compose.setComposeDetails(composeInfo.tabId, details);

  const body = `${String(definition.body || '').replace(/\r\n?/g, '\n')}\n`;
  const quotation = (!definition.forwardType && definition.quoteType == Constants.QUOTE_ALWAYS) ?
    (await MessageBody.getBody(message.id)).replace(/^/gm, '> ') : '';

  browser.tabs.executeScript(composeInfo.tabId, {
    code: `(() => {
      const citePrefix = document.querySelector('body > div.moz-cite-prefix');
      if (${String(configs.debug)})
        console.log('current body: ', { body: document.body, citePrefix });

      let body = ${JSON.stringify(body)};

      const quotation = ${JSON.stringify(quotation)};
      if (!citePrefix && quotation)
        body = body + '\\n' + quotation;

      const range = document.createRange();
      range.setStartBefore(document.body.firstChild);
      range.setEndBefore(document.body.firstChild);
      const fragment = range.createContextualFragment(body.replace(/\\n/g, '<br>'));
      range.insertNode(fragment);

      range.detach();
    })();`,
  });
}
