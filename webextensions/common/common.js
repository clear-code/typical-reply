/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';
import * as Constants from './constants.js';

const OVERRIDE_DEFAULT_CONFIGS = {}; /* Replace this for more customization on an enterprise use. */

export const configs = new Configs({
  buttons: [
    { id:             'accept',
      label:          browser.i18n.getMessage('exampleButton_accept_label'),
      accesskey:      browser.i18n.getMessage('exampleButton_accept_accesskey'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_accept_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_accept_subject'),
      body:           browser.i18n.getMessage('exampleButton_accept_body'),
      bodyImage:      browser.runtime.getURL('/resources/accept.png'),
      recipients:     Constants.RECIPIENTS_ALL,
      quoteType:      Constants.QUOTE_ALWAYS,
      allowedDomains: Constants.DOMAIN_ALL,
      icon:           browser.runtime.getURL('/resources/accept.png') },
    { id:             'reject',
      label:          browser.i18n.getMessage('exampleButton_reject_label'),
      accesskey:      browser.i18n.getMessage('exampleButton_reject_accesskey'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_reject_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_reject_subject'),
      body:           browser.i18n.getMessage('exampleButton_reject_body'),
      bodyImage:      browser.runtime.getURL('/resources/reject.png'),
      recipients:     Constants.RECIPIENTS_ALL,
      allowedDomains: Constants.DOMAIN_ALL,
      icon:           browser.runtime.getURL('/resources/reject.png') },
    { id:             'like',
      label:          browser.i18n.getMessage('exampleButton_like_label'),
      accesskey:      browser.i18n.getMessage('exampleButton_like_accesskey'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_like_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_like_subject'),
      body:           browser.i18n.getMessage('exampleButton_like_body'),
      bodyImage:      browser.runtime.getURL('/resources/like.png'),
      recipients:     Constants.RECIPIENTS_ALL,
      allowedDomains: Constants.DOMAIN_ALL,
      icon:           browser.runtime.getURL('/resources/like.png') },
    { id:             'reportAttachment',
      label:          browser.i18n.getMessage('exampleButton_reportAttachment_label'),
      accesskey:      browser.i18n.getMessage('exampleButton_reportAttachment_accesskey'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_reportAttachment_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_reportAttachment_subject'),
      body:           browser.i18n.getMessage('exampleButton_reportAttachment_body'),
      recipients:     'report@example.com',
      forwardType:    'attachment',
      allowedDomains: Constants.DOMAIN_ALL },
    { id:             'reportInline',
      label:          browser.i18n.getMessage('exampleButton_reportInline_label'),
      accesskey:      browser.i18n.getMessage('exampleButton_reportInline_accesskey'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_reportInline_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_reportInline_subject'),
      body:           browser.i18n.getMessage('exampleButton_reportInline_body'),
      recipients:     'report@example.com',
      forwardType:    'inline',
      allowedDomains: Constants.DOMAIN_ALL }
  ],
  labelQuotePrefix: browser.i18n.getMessage('labelQuotePrefix'),
  labelQuoteSuffix: browser.i18n.getMessage('labelQuoteSuffix'),
  labelNotAllowedTitle:   browser.i18n.getMessage('labelNotAllowedTitle'),
  labelNotAllowedMessage: browser.i18n.getMessage('labelNotAllowedMessage'),

  configsVersion: 0,
  debug: false,

  ...OVERRIDE_DEFAULT_CONFIGS
}, {
  localKeys: [
    'configsVersion',
    'debug'
  ]
});

export function log(message, ...args) {
  if (!configs || !configs.debug)
    return;

  const nest   = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }
  console.log(`typical-reply: ${indent}${message}`, ...args);
}

export function appendContents(parent, source) {
  const range = document.createRange();
  range.selectNodeContents(parent);
  range.collapse(false);
  const fragment = range.createContextualFragment(source.trim());
  range.insertNode(fragment);
  range.detach();
}

export function sanitizeForHTMLText(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function shouldEnableButton(button, { message }) {
  const account = await browser.accounts.get(message.folder.accountId);
  if (!button.allowedDomains || button.allowedDomains == '*')
    return true;
  const domains = new Set(Array.isArray(button.allowedDomains) ? button.allowedDomains : [button.allowedDomains]);
  const { to, cc, bcc } = await getRecipients({
    originalMessage: message,
    recipientType:   button.recipients,
    myAddress:       account.identities[0].email
  });
  const allRecipients = [...to, ...cc, ...bcc];
  const allMatched = allRecipients.every(recipient => {
    const address = /<([^>]+)>$/.test(recipient) ? RegExp.$1 : recipient;
    const domain = /@([^@]+)$/.test(address) ? RegExp.$1 : '';
    console.log('domain: ', domain);
    return domains.has(domain);
  });
  return allMatched;
}

export async function getRecipients({ originalMessage, recipientType, myAddress, identityId }) {
  if (!myAddress)
    myAddress = await getAddressFromIdentity(identityId);
  const myAddressWrapped = `<${myAddress}>`;
  log('myAddress ', myAddress);
  switch (recipientType) {
    case Constants.RECIPIENTS_ALL:
      return {
        to: [
          originalMessage.author,
          ...originalMessage.recipients
            .filter(recipient => recipient == myAddress || recipient.endsWith(myAddressWrapped))
        ],
        cc: originalMessage.ccList.filter(recipient => recipient == myAddress || recipient.endsWith(myAddressWrapped)),
        bcc: []
      };

    case Constants.RECIPIENTS_SENDER:
      return {
        to: [originalMessage.author],
        cc: [],
        bcc: []
      };

    default:
      return {
        to: [],
        cc: [],
        bcc: []
      };
  }
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
