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

var TypicalReply = {
  BASE: 'extensions.typical-reply@clear-code.com.',

  RECIPIENTS_SENDER: 'sender',
  RECIPIENTS_ALL:    'all',
  RECIPIENTS_BLANK:  'blank',

  get prefs() {
    delete this.prefs;
    let { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
    return this.prefs = prefs;
  },

  get allAccounts() {
    return this.toArray(AccountManager.accounts, Ci.nsIMsgAccount);
  },
  get allAccountKeys() {
    return this.allAccounts.map(function(aAccount) {
      return this.getAccountKey(aAccount);
    }, this).filter(function(aKey) {
      return aKey != '';
    });
  },
  toArray: function (aEnumerator, aInterface) {
    aInterface = aInterface || Ci.nsISupports;
    var array = [];
    if (aEnumerator instanceof Ci.nsISupportsArray) {
      let count = aEnumerator.Count();
      for (let i = 0; i < count; i++) {
        array.push(aEnumerator.QueryElementAt(i, aInterface));
      }
    } else if (aEnumerator instanceof Ci.nsIArray) {
      let count = aEnumerator.length;
      for (let i = 0; i < count; i++) {
        array.push(aEnumerator.queryElementAt(i, aInterface));
      }
    } else if (aEnumerator instanceof Ci.nsISimpleEnumerator) {
      while (aEnumerator.hasMoreElements()) {
        array.push(aEnumerator.getNext().QueryInterface(aInterface));
      }
    }
    return array;
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
      recipients:    this.prefs.getLocalizedPref(base + 'recipients'),
      alwaysQuote:   this.prefs.getLocalizedPref(base + 'alwaysQuote'),
      priority:      this.prefs.getLocalizedPref(base + 'priority'),
      separate:      this.prefs.getLocalizedPref(base + 'separate'),
      searchFolder:  this.prefs.getLocalizedPref(base + 'searchFolder'),
      searchTargets: this.prefs.getLocalizedPref(base + 'searchTargets'),
      icon:          this.prefs.getLocalizedPref(base + 'icon')
    };
  }
};
