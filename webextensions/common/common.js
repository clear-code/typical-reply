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
  replyingType: null,
  replyingQuoteType: null,
  buttons: [
    { id:             'accept',
      label:          browser.i18n.getMessage('exampleButton_accept_label'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_accept_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_accept_subject'),
      body:           browser.i18n.getMessage('exampleButton_accept_body'),
      bodyImage:      browser.runtime.getURL('/resources/accept.png'),
      recipients:     'all',
      quoteType:      'yes',
      priority:       '',
      allowedDomains: '*',
      icon:           browser.runtime.getURL('/resources/accept.png') },
    { id:             'reject',
      label:          browser.i18n.getMessage('exampleButton_reject_label'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_reject_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_reject_subject'),
      body:           browser.i18n.getMessage('exampleButton_reject_body'),
      bodyImage:      browser.runtime.getURL('/resources/reject.png'),
      recipients:     'all',
      quoteType:      '',
      priority:       '',
      allowedDomains: '*',
      icon:           browser.runtime.getURL('/resources/reject.png') },
    { id:             'like',
      label:          browser.i18n.getMessage('exampleButton_like_label'),
      subjectPrefix:  browser.i18n.getMessage('exampleButton_like_subjectPrefix'),
      subject:        browser.i18n.getMessage('exampleButton_like_subject'),
      body:           browser.i18n.getMessage('exampleButton_like_body'),
      bodyImage:      browser.runtime.getURL('/resources/like.png'),
      recipients:     'all',
      quoteType:      '',
      priority:       '',
      allowedDomains: '*',
      icon:           browser.runtime.getURL('/resources/like.png') }
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
