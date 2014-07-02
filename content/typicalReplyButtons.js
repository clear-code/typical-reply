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

    if (definition.recipients == this.utils.RECIPIENTS_ALL ||
        definition.recipients == this.utils.RECIPIENTS_FORWARD)
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
    if (aDefinition.icon) {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button');
      button.setAttribute('image', aDefinition.icon);
    } else {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button hdrReplyButton');
    }
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
    if (aDefinition.icon) {
      item.setAttribute('class', 'menuitem-iconic');
      item.setAttribute('image', aDefinition.icon);
    }
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

    this.startListenFolderChanges();
  },
  startListenFolderChanges: function() {
    var notifyFlags = Components.interfaces.nsIFolderListener.added |
                        Components.interfaces.nsIFolderListener.removed;
    Components.classes['@mozilla.org/messenger/services/session;1']
      .getService(Components.interfaces.nsIMsgMailSession)
      .AddFolderListener(this, notifyFlags);
  },
  // nsIFolderListener
  OnItemAdded: function(aParent, aItem) {
    try {
      aItem = aItem.QueryInterface(Ci.nsIMsgFolder);
      if (aItem.flags & Components.interfaces.nsMsgFolderFlags.Virtual)
        return;
    } catch(e) {
      return;
    }
    this.buildSearchFoldersIn(aItem.rootFolder, {
      addedFolder: aItem.URI
    });
  },
  OnItemRemoved: function(aParent, aItem) {
    try {
      aItem = aItem.QueryInterface(Ci.nsIMsgFolder);
      if (aItem.flags & Components.interfaces.nsMsgFolderFlags.Virtual)
        return;
    } catch(e) {
      return;
    }
    this.buildSearchFoldersIn(aItem.rootFolder, {
      removedFolder: aItem.URI
    });
  },
  OnItemPropertyChanged: function() {},
  OnItemIntPropertyChanged: function() {},
  OnItemBoolPropertyChanged: function() {},
  OnItemUnicharPropertyChanged: function() {},
  OnItemEvent: function() {},

  buildSearchFolders: function() {
    this.utils.allAccounts.forEach(function(aAccount) {
      if (!aAccount.incomingServer)
        return;
      this.buildSearchFoldersIn(aAccount.incomingServer.rootMsgFolder);
    }, this);
  },
  buildSearchFoldersIn: function(aRoot, aModification) {
    if (!aRoot)
      return;
    this.utils.definitions.forEach(function(aDefinition) {
      try {
        this.buildSearchFolderIn(aDefinition, aRoot, aModification);
      }
      catch(e) {
        Components.utils.reportError(e);
      }
    }, this);
  },
  buildSearchFolderIn: function(aDefinition, aRoot, aModification) {
    if (!aDefinition.searchFolder ||
        !aDefinition.subjectPrefix &&
        !aDefinition.subject ||
        !aRoot)
      return;

    var searchTargets = aDefinition.searchTargets;
    if (!searchTargets)
      return;

    var searchFolders;
    if (!aModification) {
      searchFolders = this.getSearchFolders(aRoot, searchTargets.split(/[,\s]+/));
      if (!searchFolders)
        return;
    }

    var name = 'typicalReply-' + aDefinition.type;

    var isCreation = false;
    var isModified = false;
    var virtualFolder;
    try {
      virtualFolder = aRoot.getChildNamed(name);
    } catch(e) {
      try {
        virtualFolder = aRoot.getChildNamed(aDefinition.label);
        if (!(virtualFolder.flags & Components.interfaces.nsMsgFolderFlags.Virtual))
          virtualFolder = null;
      } catch(e) {
        // folder not found!
      }
    }
    if (!virtualFolder) {
      isCreation = true;
      isModified = true;
      virtualFolder = aRoot.addSubfolder(name);
      virtualFolder.setFlag(Components.interfaces.nsMsgFolderFlags.Virtual);
    }

    // We always have to set prettyName because it is not saved.
    virtualFolder.prettyName = aDefinition.label;

    var wrapper = this.virtualFolderHelper.wrapVirtualFolder(virtualFolder);

    var conditions = this.buildSearchCondition(aDefinition);
    if (wrapper.searchString != conditions) {
      wrapper.searchString = conditions;
      isModified = true;
    }
    var currentSearchFolders = wrapper.searchFolders.map(function(aFolder) {
      return aFolder.URI
    }).join('|');
    if (aModification) {
      searchFolders = currentSearchFolders.split('|');
      if (aModification.addedFolder) {
        let index = searchFolders.indexOf(aModification.addedFolder);
        if (index < 0) {
          searchFolders.push(aModification.addedFolder);
        }
      }
      if (aModification.removedFolder) {
        let index = searchFolders.indexOf(aModification.removedFolder);
        if (index > -1) {
          searchFolders.splice(index, 1);
        }
      }
      searchFolders = searchFolders.join('|');
    }
    if (currentSearchFolders != searchFolders) {
      wrapper.searchFolders = searchFolders;
      isModified = true;
    }
    if (isCreation) {
      wrapper.onlineSearch = false;
    }

    if (!isModified)
      return;

    wrapper.cleanUpMessageDatabase();
    if (isCreation) {
      virtualFolder.msgDatabase.Close(true);
      aRoot.NotifyItemAdded(virtualFolder);
    }
    MailServices.accounts.saveVirtualFolders();
  },
  getSearchFolders: function(aRoot, aKeys) {
    var flags = {};
    Object.keys(Components.interfaces.nsMsgFolderFlags).forEach(function(aKey) {
      flags[aKey.toLowerCase()] = Components.interfaces.nsMsgFolderFlags[aKey];
    });
    var folders = [];
    aKeys.some(function(aKey) {
      aKey = aKey.toLowerCase();
      if (aKey == 'all') {
        folders = this.utils.getDescendants(aRoot).map(function(aFolder) {
          return aFolder.URI;
        });
        return true;
      }
      if (typeof flags[aKey] == 'number') {
        let folder = aRoot.getFolderWithFlags(flags[aKey]);
        if (folder)
          folders.push(folder.URI);
      }
      return false;
    }, this);
    try {
      if (folders.length > 0)
        folders.unshift(aRoot.URI);
    } catch(e) {
    }
    return folders.join('|');
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
