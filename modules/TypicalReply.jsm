/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ['TypicalReply'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

var AccountManager = Cc['@mozilla.org/messenger/account-manager;1']
                       .getService(Ci.nsIMsgAccountManager);

Cu.import('resource://typical-reply-modules/SearchFolderManager.jsm');

var TypicalReply = {
  BASE: 'extensions.typical-reply@clear-code.com.',

  RECIPIENTS_SENDER: 'sender',
  RECIPIENTS_ALL:    'all',
  RECIPIENTS_BLANK:  'blank',
  RECIPIENTS_FORWARD: 'forward',

  AUTO_SEND_NEVER:    'never',
  AUTO_SEND_ALWAYS:   'always',
  AUTO_SEND_NO_QUOTE: 'noquote',

  get prefs() {
    delete this.prefs;
    let { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
    return this.prefs = prefs;
  },

  extractAddresses: function(aMIMEFieldValue) {
    var MimeHeaderParser = Cc['@mozilla.org/messenger/headerparser;1']
                             .getService(Ci.nsIMsgHeaderParser);
    var addresses = {};
    var names = {};
    var fullNames = {};
    var numAddresses = MimeHeaderParser.parseHeadersWithArray(
                         aMIMEFieldValue, addresses, names, fullNames);
    return addresses.value;
  },

  get type() {
    return this.prefs.getPref(this.BASE + 'replying.type');
  },
  set type(aType) {
    aType = String(aType);
    this.prefs.setPref(this.BASE + 'replying.type', aType);
    return aType;
  },

  get quote() {
    return this.prefs.getPref(this.BASE + 'replying.quote');
  },
  set quote(aQuote) {
    aQuote = Boolean(aQuote);
    this.prefs.setPref(this.BASE + 'replying.quote', aQuote);
    return aQuote;
  },

  reset: function() {
    this.type = '';
    this.quote = false;
  },

  get definitions() {
    delete this.definitions;
    var base = this.BASE + 'reply';
    this.definitions = this.prefs.getPref(this.BASE + 'buttons').split(/(?:\s*,\s*|\s+)/).map(function(aType) {
      return this.getDefinition(aType);
    }, this);
    return this.definitions;
  },
  get definitionsByType() {
    delete this.definitionsByType;
    this.definitionsByType = {};
    this.definitions.forEach(function(aDefinition) {
      this.definitionsByType[aDefinition.type] = aDefinition;
    }, this);
    return this.definitionsByType;
  },
  get subjectDetector() {
    delete this.subjectDetector;
    var subjectPatterns = []
    this.definitions.forEach(function(aDefinition) {
      if (aDefinition.subjectPrefix)
        subjectPatterns.push(this.sanitizeForRegExp(aDefinition.subjectPrefix));
      if (aDefinition.subject)
        subjectPatterns.push(this.sanitizeForRegExp(aDefinition.subject));
    }, this);
    this.subjectDetector = new RegExp('^(' + subjectPatterns.join('|') +  ')');
    return this.subjectDetector;
  },
  sanitizeForRegExp: function(aString) {
    return aString.replace(/([\.\+\*\?\:\[\]\\^\$\#\%\{\}\|\&])/g, '\\$1');
  },

  checkAllowedForRecipients: function(aRecipients, aAllowedDomains) {
    if (aAllowedDomains == '' || aAllowedDomains == '*')
      return true;

    aAllowedDomains = aAllowedDomains.split(/\s*,\s*/);
    return aRecipients.every(function(aRecipient) {
      var addresses = this.extractAddresses(aRecipient);
      return addresses.every(function(aAddress) {
        return aAllowedDomains.some(function(aDomain) {
          return aAddress.indexOf('@' + aDomain) > 0;
        });
      }, this);
    }, this);
  },

  getDefinition: function(aType) {
    var base = this.BASE + 'reply.' + aType + '.';
    return {
      type:          aType,
      label:         this.prefs.getLocalizedPref(base + 'label'),
      labelQuote:    this.prefs.getLocalizedPref(this.BASE + 'label.quote.before') +
                     this.prefs.getLocalizedPref(base + 'label') +
                     this.prefs.getLocalizedPref(this.BASE + 'label.quote.after'),
      accesskey:     this.prefs.getLocalizedPref(base + 'accesskey'),
      subjectPrefix: this.prefs.getLocalizedPref(base + 'subjectPrefix'),
      subject:       this.prefs.getLocalizedPref(base + 'subject'),
      body:          this.prefs.getLocalizedPref(base + 'body'),
      bodyImage:     this.prefs.getLocalizedPref(base + 'bodyImage'),
      recipients:    (this.prefs.getLocalizedPref(base + 'recipients') || '').toLowerCase(),
      alwaysQuote:   this.prefs.getLocalizedPref(base + 'alwaysQuote'),
      priority:      this.prefs.getLocalizedPref(base + 'priority'),
      separate:      this.prefs.getLocalizedPref(base + 'separate'),
      searchFolder:  this.prefs.getLocalizedPref(base + 'searchFolder'),
      searchTargets: this.prefs.getLocalizedPref(base + 'searchTargets'),
      allowedDomains: (this.prefs.getLocalizedPref(base + 'allowedDomains') || '').trim(),
      autoSend:      (this.prefs.getLocalizedPref(base + 'autoSend') || '').toLowerCase(),
      icon:          this.prefs.getLocalizedPref(base + 'icon')
    };
  }
};

new SearchFolderManager(TypicalReply.definitions.filter(function(aDefinition) {
  return aDefinition.searchFolder;
}));
