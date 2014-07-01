/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var TypicalReplyButtons = {
  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});
    return this.utils = TypicalReply;
  },

  get virtualFolderHelper() {
    delete this.virtualFolderHelper;
    let { VirtualFolderHelper } = Components.utils.import('resource:///modules/virtualFolderWrapper.js', {});
    return this.virtualFolderHelper = VirtualFolderHelper;
  },

  onCommand: function(aEvent) {
    var target = aEvent.target;
    var type = target.getAttribute('data-type');

    var definition = this.utils.getDefinition(type);

    if (definition.alwaysQuote)
      this.utils.quote = true;
    else
      this.utils.quote = target.getAttribute('data-quote') == 'true';

    this.utils.type = type;

    if (definition.recipients == this.utils.RECIPIENTS_ALL)
      MsgReplyToAllMessage(aEvent);
    else
      MsgReplySender(aEvent);
  },

  get container() {
    return document.getElementById('typicalReply-buttons-container');
  },
  get actionsButton() {
    return document.getElementById('typicalReply-actions-button');
  },
  get menupopup() {
    return document.getElementById('typicalReply-menupopup');
  },

  buildUI: function() {
    var buttons = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition) {
      if (aDefinition.separate)
        buttons.appendChild(this.buildActionButton(aDefinition));
    }, this);
    this.container.insertBefore(buttons, this.actionsButton);

    var menupopupChildren = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition, aIndex) {
      if (aDefinition.separate)
        return;

      if (aIndex > 0)
        menupopupChildren.appendChild(document.createElement('menuseparator'));

      menupopupChildren.appendChild(this.buildActionItems(aDefinition));
    }, this);
    this.menupopup.appendChild(menupopupChildren);
    if (!this.menupopup.hasChildNodes())
      this.actionsButton.setAttribute('hidden', true);
  },
  buildActionButton: function(aDefinition) {
    var button = document.createElement('toolbarbutton');
    button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button hdrReplyButton');
    button.setAttribute('label', aDefinition.label);
    button.setAttribute('data-type', aDefinition.type);
    button.setAttribute('oncommand', 'TypicalReplyButtons.onCommand(event);');
    if (aDefinition.alwaysQuote) {
      button.setAttribute('data-quote', 'true');
    }
    else {
      button.setAttribute('type', 'menu-button');
      let menupopup = document.createElement('menupopup');
      this.buildActionItems(aDefinition, menupopup);
      button.appendChild(menupopup);
    }
    return button;
  },
  buildActionItems: function(aDefinition) {
    var fragment = document.createDocumentFragment();
    var item = document.createElement('menuitem');
    item.setAttribute('label', aDefinition.label);
    item.setAttribute('accesskey', aDefinition.accesskey);
    item.setAttribute('data-type', aDefinition.type);
    if (aDefinition.alwaysQuote) {
      item.setAttribute('data-quote', 'true');
      fragment.appendChild(item);
    }
    else {
      fragment.appendChild(item);
      let withQuote = item.cloneNode(true);
      withQuote.setAttribute('label', aDefinition.labelQuote);
      withQuote.setAttribute('data-quote', 'true');
      fragment.appendChild(withQuote);
    }
    return fragment;
  },

  observe: function(aSubject, aTopic, aData) {
    Services.obs.removeObserver(this, 'mail-tabs-session-restored');
    // This must be done after mail-tabs-session-restored.
    // Otherwise, non-ASCII search conditions are not saved correctly.
    this.buildSearchFolders();
  },

  buildSearchFolders: function() {
    this.utils.allAccounts.forEach(function(aAccount) {
      this.utils.definitions.forEach(function(aDefinition) {
        if (!aDefinition.searchFolder)
          return;
        try {
          if (aAccount.incomingServer)
            this.buildSearchFolderForAccount(aDefinition, aAccount);
        }
        catch(e) {
          Components.utils.reportError(e);
        }
      }, this);
    }, this);
  },
  buildSearchFolderForAccount: function(aDefinition, aAccount) {
    if (!aDefinition.subjectPrefix && !aDefinition.subject)
      return;

    var rootFolder = aAccount.incomingServer.rootMsgFolder;
    if (!rootFolder)
      return;

    var inbox = rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Inbox);
    if (!inbox)
      return;

    var name = 'typicalReply-' + aDefinition.type;

    var isCreation = false;
    var isModified = false;
    var searchFolder;
    try {
      searchFolder = rootFolder.getChildNamed(name);
    } catch(e) {
     // folder not found!
    }
    if (!searchFolder) {
      isCreation = true;
      isModified = true;
      searchFolder = rootFolder.addSubfolder(name);
      searchFolder.setFlag(Components.interfaces.nsMsgFolderFlags.Virtual);
    }

    // We always have to set prettyName because it is not saved.
    searchFolder.prettyName = aDefinition.label;

    var wrapper = this.virtualFolderHelper.wrapVirtualFolder(searchFolder);

    var conditions = this.buildSearchCondition();
    if (wrapper.searchString != conditions) {
      wrapper.searchString = conditions;
      isModified = true;
    }
    if (isCreation) {
      wrapper.searchFolders = rootFolder.URI + '|' + inbox.URI;
      wrapper.onlineSearch = false;
    }

    if (!isModified)
      return;

    wrapper.cleanUpMessageDatabase();
    if (isCreation) {
      searchFolder.msgDatabase.Close(true);
      rootFolder.NotifyItemAdded(searchFolder);
    }
    MailServices.accounts.saveVirtualFolders();
  },
  buildSearchCondition: function(aDefinition) {
    if (aDefinition.subjectPrefix)
      return 'AND (subject,begins with,' + this.UnicodeToUTF8(aDefinition.subjectPrefix) + ')';

    return 'AND (subject,is,' + this.UnicodeToUTF8(aDefinition.subject) + ')';
  },
  UnicodeToUTF8: function(aString) {
    return unescape(encodeURIComponent(aString));
  }
};

window.addEventListener('DOMContentLoaded', function TypicalReplyButtonsSetup() {
  window.removeEventListener('DOMContentLoaded', TypicalReplyButtonsSetup, false);

  TypicalReplyButtons.buildUI();

  var toolbar = document.getElementById('header-view-toolbar');
  var matcher = /\b(hdrReplyToSenderButton,hdrSmartReplyButton|hdrReplyToSenderButton|hdrSmartReplyButton|hdrForwardButton)\b/;
  var defaultset = toolbar.getAttribute('defaultset');
  if (matcher.test(defaultset))
    toolbar.setAttribute('defaultset', defaultset.replace(matcher, '$1,typicalReply-buttons-container'));
  else
    toolbar.setAttribute('defaultset', defaultset + ',typicalReply-buttons-container');

  Services.obs.addObserver(TypicalReplyButtons, 'mail-tabs-session-restored', false);
}, false);
