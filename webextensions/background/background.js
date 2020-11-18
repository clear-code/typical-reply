/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log,
  shouldEnableButton,
  getRecipients,
} from '/common/common.js';
import * as Constants from '/common/constants.js';
import * as MessageBody from '/extlib/messageBody.js';

MessageBody.setLogger(log);

configs.$loaded.then(() => {
  const buttons = configs.buttons || [];
  if (buttons.length > 1)
    return;

  const button = buttons[0];
  if (!button.quoteType && !button.forwardType)
    return;

  browser.messageDisplayAction.setPopup({ popup: '' });
  browser.messageDisplayAction.setTitle({ title: button.label });
  if (button.icon)
    browser.messageDisplayAction.setIcon({ path: button.icon });
  browser.messageDisplayAction.onClicked.addListener((_tab, _info) => {
    startTypicalReply(button).catch(console.error);
  });
});

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  const buttons = configs.buttons || [];
  const allDisabled = (await Promise.all(buttons.map(button => shouldEnableButton(button, { message })))).every(enabled => !enabled);
  if (allDisabled)
    browser.messageDisplayAction.disable(tab.id);
  else
    browser.messageDisplayAction.enable(tab.id);
});

browser.messageDisplay.onMessagesDisplayed.addListener((tab, messages) => {
  if (messages.length > 1)
    browser.messageDisplayAction.disable(tab.id);
});

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
      startTypicalReply(message.params).catch(console.error);
      break;
  }
});

async function startTypicalReply(params) {
  log(`startTypicalReply: `, params);
  if (!params)
    return;

  const tabs = await browser.mailTabs.query({ active: true, windowId: browser.windows.WINDOW_ID_CURRENT });
  if (tabs.length == 0)
    return;

  const tab     = tabs[0];
  const message = await browser.messageDisplay.getDisplayedMessage(tab.id);
  log('original message: ', message);

  const composeInfo = await new Promise(async (resolve, _reject) => {
    lastComposingResolver = resolve;
    const details = {
      isPlainText: !params.bodyImage
    };
    switch (params.forwardType) {
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
        switch (params.recipients) {
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
  log('composeInfo ', composeInfo);

  // We need to set details after the composition window is opened,
  // because some details (ex. subject) are ignored for forwarded mails.

  const details = {
    subject: String(params.subject || '').trim()
  };

  if (!details.subject &&
      (params.subjectPrefix || params.subjectSuffix))
    details.subject = `${params.subjectPrefix || ''}${message.subject}${params.subjectSuffix || ''}`.trim();

  switch (params.recipients) {
    case Constants.RECIPIENTS_ALL:
      if (composeInfo.details.to.length == 0) {
        log(`params.recipients=${params.recipients}: recipients are unexpectedly blank, fallback to custom method`);
        const { to, cc } = await getRecipients({
          originalMessage: message,
          recipientType:   params.recipients,
          identityId:      composeInfo.details.identityId
        });
        details.to = to;
        details.cc = cc;
      }
      break;

    case Constants.RECIPIENTS_SENDER:
      if (composeInfo.details.to.length == 0) {
        log(`params.recipients=${params.recipients}: recipients are unexpectedly blank, fallback to custom method`);
        const { to } = await getRecipients({
          originalMessage: message,
          recipientType:   params.recipients,
          identityId:      composeInfo.details.identityId
        });
        details.to = to;
      }
      break;

    case Constants.RECIPIENTS_BLANK:
      details.to = [];
      break;

    default: {
      const recipients = Array.isArray(params.recipients) ? params.recipients : [String(params.recipients || '')];
      details.to = recipients.map(address => address.trim()).filter(address => !!address);
    }; break;
  }

  log('set details ', details);
  try {
    await browser.compose.setComposeDetails(composeInfo.tabId, details);
  }
  catch(error) {
    console.log(error);
  }

  log('perpare body ');
  const body = `${String(params.body || '').replace(/\r\n?/g, '\n')}\n`;
  const bodyImage = params.bodyImage && !composeInfo.details.isPlainText && await getImageDataURI(params.bodyImage).catch(error => {
    log('failed to get image data: URI ', error);
    return '';
  });
  const quotation = (!params.forwardType && params.quoteType == Constants.QUOTE_ALWAYS) ?
    (await MessageBody.getBody(message.id).catch(error => { console.log(error); return ''; })).replace(/^/gm, '> ') : '';

  log('set body ', { body, bodyImage, quotation });
  browser.tabs.executeScript(composeInfo.tabId, {
    code: `setTimeout(() => {
      const citePrefix = document.querySelector('body > div.moz-cite-prefix');
      if (${String(configs.debug)})
        console.log('current body: ', { body: document.body, citePrefix });

      let body = ${JSON.stringify(body)};

      const bodyImage = ${JSON.stringify(bodyImage)};
      if (bodyImage)
        body += '<img src=' + JSON.stringify(bodyImage) + ' alt="">\\n';

      const quotation = ${JSON.stringify(quotation)};
      if (!citePrefix && quotation)
        body = body + '\\n' + quotation;

      const range = document.createRange();
      range.setStartBefore(document.body.firstChild);
      range.setEndBefore(document.body.firstChild);
      const fragment = range.createContextualFragment(body.replace(/\\n/g, '<br>'));
      range.insertNode(fragment);

      range.detach();
    }, 250);`,
  });
}

async function getImageDataURI(url) {
  if (url.startsWith('data:'))
    return url;

  return new Promise((resolve, reject) => {
    const image = new Image();
    let resolved = false;
    let rejected = false;
    image.addEventListener('load', () => {
      if (rejected)
        return;
      resolved = true;

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    }, { once: true });
    image.addEventListener('error', error => {
      if (resolved)
        return;
      rejected = true;
      reject(error);
    }, { once: true });
    image.src = url;
  });

}
