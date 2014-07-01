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

    if (!this.utils.quote) {
      editor.selectAll();
      editor.deleteSelection(1, 0);
    }

    var definition = this.utils.getDefinition(this.utils.type);

    var subjectField = GetMsgSubjectElement();
    if (definition.subject) {
      subjectField.value = definition.subject;
    }
    if (definition.subjectPrefix) {
      subjectField.value = definition.subjectPrefix + ': ' + subjectField.value;
    }

    if (definition.body) {
      editor.insertText(definition.body);
    }
    if (definition.bodyImage &&
        editor instanceof Components.interfaces.nsIHTMLEditor) {
      if (definition.body) {
        let lineBreak = editor.createElementWithDefaults('br');
        editor.insertElementAtSelection(lineBreak, false);
      }
      let image = editor.createElementWithDefaults('img');
      image.setAttribute('src', definition.bodyImage);
      editor.insertElementAtSelection(image, false);
    }

    if (definition.recipients == this.utils.RECIPIENTS_BLANK) {
      awResetAllRows();
      AdjustFocus();
    }

    if (definition.priority) {
      let msgCompFields = gMsgCompose.compFields;
      if (msgCompFields) {
        msgCompFields.priority = definition.priority;
        updatePriorityToolbarButton(definition.priority)
      }
    }

    editor.resetModificationCount();
    editor.suppressDispatchingInputEvent = false;
    editor.enableUndo(true);

    this.utils.reset();
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
