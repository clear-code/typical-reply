/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TypicalReplyCompose = {
  log(...args) {
    if (!Services.prefs.getBoolPref('extensions.typical-reply@clear-code.com.debug'))
      return;
    console.log('[TypicalReplyCompose] ', ...args);
  },

  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});
    return this.utils = TypicalReply;
  },

  async init() {
    this.log('init: type = ', this.utils.type);
    if (!this.utils.type)
      return;

    try {
    const editor = gMsgCompose.editor;
    editor.enableUndo(false);
    editor.suppressDispatchingInputEvent = true;

    const quote = this.utils.quote;
    this.log('init: quote = ', quote);
    if (!quote) {
      editor.selectAll();
      editor.deleteSelection(1, 0);
    }

    const definition = this.utils.getDefinition(this.utils.type);
    this.log('init: definition = ', definition);

    this.applySubject(definition);
    this.applyBody(definition);
    this.applyRecipients(definition);
    this.applyPriority(definition);

    editor.resetModificationCount();
    editor.suppressDispatchingInputEvent = false;
    editor.enableUndo(true);


    this.checkAllowed(definition);
    this.processAutoSend(definition, quote);
    }
    catch(error) {
      console.log(error);
    }
    finally {
      this.utils.reset();
    }
  },
  applySubject(aDefinition) {
    const subjectField = GetMsgSubjectElement();
    if (aDefinition.subject) {
      subjectField.value = aDefinition.subject;
    }
    if (aDefinition.subjectPrefix) {
      subjectField.value = aDefinition.subjectPrefix + ': ' + subjectField.value;
    }
    this.log('applySubject: ', subjectField.value);
  },
  applyBody(aDefinition) {
    const editor = gMsgCompose.editor;
    if (aDefinition.body) {
      if (typeof editor.insertText == 'function')
        editor.insertText(aDefinition.body);
      else
        editor.insertNode(editor.document.createTextNode(aDefinition.body), editor.document.body, 0);
      this.log('applyBody: insertText ', aDefinition.body);
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
  applyRecipients(aDefinition) {
    switch (aDefinition.recipients) {
      case this.utils.RECIPIENTS_BLANK:
        this.log('applyRecipients: blank');
        awCleanupRows();
        AdjustFocus();
        return;

      case this.utils.RECIPIENTS_FORWARD:
        this.log('applyRecipients: forward');
        this.awRecipientItems.forEach(function(aItem) {
          const chooser = this.getRecipientTypeChooser(aItem);
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
        this.log('applyRecipients: default');
        if (/[^@]+@[^@]+/.test(aDefinition.recipients)) {
          this.log('applyRecipients: => specific recipients');
          awCleanupRows();
          AdjustFocus();
          let first = true;
          for (const recipient of aDefinition.recipients.split(',')) {
            this.log('applyRecipients: recipient = ', recipient);
            if (!first)
              awAppendNewRow(true);
            const items = this.awRecipientItems;
            const field = this.getRecipientField(items[items.length-1]);
            field.value = recipient;
            first = false;
          }
        }
        return;
    }
  },
  get awRecipientItems() {
    const items = document.querySelectorAll('#addressingWidget .addressingWidgetItem');
    return Array.slice(items, 0);
  },
  getRecipientTypeChooser(aItem) {
    return aItem.querySelector('menulist');
  },
  getRecipientField(aItem) {
    return aItem.querySelector('textbox');
  },
  applyPriority(aDefinition) {
    if (aDefinition.priority) {
      let msgCompFields = gMsgCompose.compFields;
      if (msgCompFields) {
        msgCompFields.priority = aDefinition.priority;
        updatePriorityToolbarButton(aDefinition.priority)
      }
      this.log('applyPriority: priority = ', aDefinition.priority);
    }
  },

  checkAllowed(aDefinition) {
    const addresses = this.awRecipientItems.map(function(aItem) {
      const field = this.getRecipientField(aItem);
      return field.value;
    }, this);

    if (this.utils.checkAllowedForRecipients(addresses, aDefinition.allowedDomains))
      return;

    const title = this.utils.prefs.getLocalizedPref(this.utils.BASE + 'label.notAllowed.title');
    const message = this.utils.prefs.getLocalizedPref(this.utils.BASE + 'label.notAllowed.message');
    Services.prompt.alert(window, title, message)

    goDoCommand('cmd_close');
  },

  processAutoSend(aDefinition, aQuote) {
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

  handleEvent(aEvent) {
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
  NotifyComposeFieldsReady() {},
  NotifyComposeBodyReady() {
    setTimeout(this.init.bind(this), 100);
  },
  ComposeProcessDone() {},
  SaveInFolderDone() {}
};

document.documentElement.addEventListener('compose-window-init', TypicalReplyCompose, false);
