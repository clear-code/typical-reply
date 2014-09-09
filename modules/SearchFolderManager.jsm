/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ['SearchFolderManager'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyServiceGetter(this,
                                   'AccountManager',
                                   '@mozilla.org/messenger/account-manager;1',
                                   'nsIMsgAccountManager');
XPCOMUtils.defineLazyServiceGetter(this,
                                   'MailSession',
                                   '@mozilla.org/messenger/services/session;1',
                                   'nsIMsgMailSession');

XPCOMUtils.defineLazyModuleGetter(this,
                                  'Services',
                                  'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this,
                                  'MailServices',
                                  'resource:///modules/mailServices.js');
XPCOMUtils.defineLazyModuleGetter(this,
                                  'VirtualFolderHelper',
                                  'resource:///modules/virtualFolderWrapper.js');

function SearchFolderManager(aDefinitions) {
  this.definitions = aDefinitions;

  Services.obs.addObserver(this, 'mail-tabs-session-restored', false);
}
SearchFolderManager.prototype = {
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
  getDescendants: function(aRoot) {
    var folders = [];
    if ('descendants' in aRoot) { // Thunderbird 24
      let descendants = aRoot.descendants;
      for (let i = 0, maxi = descendants.length; i < maxi; i++) {
        let folder = descendants.queryElementAt(i, Ci.nsIMsgFolder);
        folders.push(folder);
      }
    } else { // Thunderbird 17 or olders
      let descendants = Cc['@mozilla.org/supports-array;1']
                          .createInstance(Ci.nsISupportsArray);
      aRoot.ListDescendents(descendants);
      for (let i = 0, maxi = descendants.Count(); i < maxi; i++) {
        let folder = descendants.GetElementAt(i).QueryInterface(Ci.nsIMsgFolder);
        folders.push(folder);
      }
    }
    return folders;
  },


  observe: function(aSubject, aTopic, aData) {
    Services.obs.removeObserver(this, 'mail-tabs-session-restored');
    // This must be done after mail-tabs-session-restored.
    // Otherwise, non-ASCII search conditions are not saved correctly.
    this.buildSearchFolders();

    this.startListenFolderChanges();
  },
  startListenFolderChanges: function() {
    var notifyFlags = Ci.nsIFolderListener.added |
                        Ci.nsIFolderListener.removed;
    MailSession.AddFolderListener(this, notifyFlags);
  },
  // nsIFolderListener
  OnItemAdded: function(aParent, aItem) {
    try {
      aItem = aItem.QueryInterface(Ci.nsIMsgFolder);
      if (aItem.flags & Ci.nsMsgFolderFlags.Virtual)
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
      if (aItem.flags & Ci.nsMsgFolderFlags.Virtual)
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
    this.allAccounts.forEach(function(aAccount) {
      if (!aAccount.incomingServer)
        return;
      this.buildSearchFoldersIn(aAccount.incomingServer.rootMsgFolder);
    }, this);
  },
  buildSearchFoldersIn: function(aRoot, aModification) {
    if (!aRoot)
      return;
    this.definitions.forEach(function(aDefinition) {
      try {
        this.buildSearchFolderIn(aDefinition, aRoot, aModification);
      }
      catch(e) {
        Cu.reportError(e);
      }
    }, this);
  },
  buildSearchFolderIn: function(aDefinition, aRoot, aModification) {
    if (!aRoot)
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

    var name = 'autoGeneratedSearchFolder-' + encodeURIComponent(aDefinition.label).replace(/%/g, '_');

    var isCreation = false;
    var isModified = false;
    var virtualFolder;
    try {
      virtualFolder = aRoot.getChildNamed(name);
    } catch(e) {
      try {
        virtualFolder = aRoot.getChildNamed(aDefinition.label);
        if (!(virtualFolder.flags & Ci.nsMsgFolderFlags.Virtual))
          virtualFolder = null;
      } catch(e) {
        // folder not found!
      }
    }
    if (!virtualFolder) {
      isCreation = true;
      isModified = true;
      virtualFolder = aRoot.addSubfolder(name);
      virtualFolder.setFlag(Ci.nsMsgFolderFlags.Virtual);
    }

    // We always have to set prettyName because it is not saved.
    virtualFolder.prettyName = aDefinition.label;

    var wrapper = VirtualFolderHelper.wrapVirtualFolder(virtualFolder);

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
    Object.keys(Ci.nsMsgFolderFlags).forEach(function(aKey) {
      flags[aKey.toLowerCase()] = Ci.nsMsgFolderFlags[aKey];
    });
    var folders = [];
    aKeys.some(function(aKey) {
      aKey = aKey.toLowerCase();
      if (aKey == 'all') {
        folders = this.getDescendants(aRoot).map(function(aFolder) {
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