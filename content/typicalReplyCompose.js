/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var TypicalReplyCompose = {
  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm');
    return this.utils = TypicalReply;
  },

  init: function() {
    if (!this.utils.type)
      return;

    var editor = gMsgCompose.editor;
    editor.enableUndo(false);
    editor.suppressDispatchingInputEvent = true;

    var quote = this.utils.quote;
    if (!quote) {
      editor.selectAll();
      editor.deleteSelection(1, 0);
    }

    var definition = this.utils.getDefinition(this.utils.type);

    this.applySubject(definition);
    this.applyBody(definition);
    this.applyRecipients(definition);
    this.applyPriority(definition);

    editor.resetModificationCount();
    editor.suppressDispatchingInputEvent = false;
    editor.enableUndo(true);

    this.utils.reset();

    this.checkAllowed(definition);
    this.processAutoSend(definition, quote);
  },
  applySubject: function(aDefinition) {
    var subjectField = GetMsgSubjectElement();
    if (aDefinition.subject) {
      subjectField.value = aDefinition.subject;
    }
    if (aDefinition.subjectPrefix) {
      subjectField.value = aDefinition.subjectPrefix + ': ' + subjectField.value;
    }
  },
  applyBody: function(aDefinition) {
    var editor = gMsgCompose.editor;
    if (aDefinition.body) {
      editor.insertText(aDefinition.body);
    }
    if (aDefinition.bodyImage &&
        editor instanceof Components.interfaces.nsIHTMLEditor) {
      if (aDefinition.body) {
        let lineBreak = editor.createElementWithDefaults('br');
        editor.insertElementAtSelection(lineBreak, false);
      }
      let image = editor.createElementWithDefaults('img');
      image.setAttribute('src', aDefinition.bodyImage);
      editor.insertElementAtSelection(image, false);
    }
  },
  applyRecipients: function(aDefinition) {
    switch (aDefinition.recipients) {
      case this.utils.RECIPIENTS_BLANK:
        awResetAllRows();
        AdjustFocus();
        return;

      case this.utils.RECIPIENTS_FORWARD:
        this.awRecipientItems.forEach(function(aItem) {
          var chooser = this.getRecipientTypeChooser(aItem);
          if (chooser.value == 'addr_to')
            chooser.value = 'addr_cc';
        }, this);
        awAppendNewRow(true);
        {
          let items = this.awRecipientItems;
          let appendedRow = items[items.length - 1];
          let chooser = this.getRecipientTypeChooser(appendedRow);
          chooser.value = 'addr_to';
        }
        return;

      default:
        return;
    }
  },
  get awRecipientItems() {
    var items = document.querySelectorAll('#addressingWidget listitem.addressingWidgetItem');
    return Array.slice(items, 0);
  },
  getRecipientTypeChooser: function(aItem) {
    return aItem.querySelector('menulist');
  },
  getRecipientField: function(aItem) {
    return aItem.querySelector('textbox');
  },
  applyPriority: function(aDefinition) {
    if (aDefinition.priority) {
      let msgCompFields = gMsgCompose.compFields;
      if (msgCompFields) {
        msgCompFields.priority = aDefinition.priority;
        updatePriorityToolbarButton(aDefinition.priority)
      }
    }
  },

  checkAllowed: function(aDefinition) {
    var addresses = this.awRecipientItems.map(function(aItem) {
      var field = this.getRecipientField(aItem);
      return field.value;
    }, this);

    if (this.utils.checkAllowedForRecipients(addresses, aDefinition.allowedDomains))
      return;

    var title = this.utils.prefs.getLocalizedPref(this.utils.BASE + 'label.notAllowed.title');
    var message = this.utils.prefs.getLocalizedPref(this.utils.BASE + 'label.notAllowed.message');
    Services.prompt.alert(window, title, message)

    goDoCommand('cmd_close');
  },

  processAutoSend: function(aDefinition, aQuote) {
    switch (aDefinition.autoSend) {
      case this.utils.AUTO_SEND_NO_QUOTE:
        if (aQuote)
          return;
      case this.utils.AUTO_SEND_ALWAYS:
        goDoCommand('cmd_sendNow');
        return;

      default:
        return;
    }
  },

  handleEvent: function(aEvent) {
    switch (aEvent.type) {
      case 'compose-window-init':
        document.documentElement.addEventListener('compose-window-close', this, false);
        window.addEventListener('unload', this, false);
        gMsgCompose.RegisterStateListener(this);
        return;

      case 'compose-window-close':
        gMsgCompose.UnregisterStateListener(this);
        return;

      case 'unload':
        document.documentElement.removeEventListener('compose-window-init', this, false);
        document.documentElement.removeEventListener('compose-window-close', this, false);
        window.removeEventListener('unload', this, false);
        return;
    }
  },

  // nsIMsgComposeStateListener
  NotifyComposeFieldsReady: function() {},
  NotifyComposeBodyReady: function() {
    setTimeout(this.init.bind(this), 100);
  },
  ComposeProcessDone: function() {},
  SaveInFolderDone: function() {}
};

document.documentElement.addEventListener('compose-window-init', TypicalReplyCompose, false);
