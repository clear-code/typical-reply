/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var TypicalReplyButtons = {
  get utils() {
    delete this.utils;
    let { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});
    return this.utils = TypicalReply;
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

  get toolbar() {
    return document.getElementById('header-view-toolbar');
  },
  get palette() {
    return document.getElementById('header-view-toolbar-palette');
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

  toolbarItemIDs: [],

  buildUI: function() {
    var buttons = document.createDocumentFragment();
    this.utils.definitions.forEach(function(aDefinition) {
      if (!aDefinition.separate)
        return;

      var button = this.buildActionButton(aDefinition);
      this.toolbarItemIDs.push(button.getAttribute('id'));
      button.setAttribute('removable', true);
      buttons.appendChild(button);
    }, this);
    this.palette.insertBefore(buttons, this.container);

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

    this.toolbarItemIDs.push(this.container.getAttribute('id'));
  },
  buildActionButton: function(aDefinition) {
    var button = document.createElement('toolbarbutton');
    button.setAttribute('id', 'typicalReply-button-' + aDefinition.type);
    if (aDefinition.icon) {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button');
      button.setAttribute('image', aDefinition.icon);
    } else {
      button.setAttribute('class', 'toolbarbutton-1 msgHeaderView-button hdrReplyButton');
    }
    button.setAttribute('label', aDefinition.label);
    button.setAttribute('tooltiptext', aDefinition.label);
    button.setAttribute('data-type', aDefinition.type);
    button.setAttribute('oncommand', 'TypicalReplyButtons.onCommand(event);');
    if (aDefinition.alwaysQuote) {
      button.setAttribute('data-quote', 'true');
    }
    else {
      button.setAttribute('type', 'menu-button');
      let menupopup = document.createElement('menupopup');
      menupopup.appendChild(this.buildActionItems(aDefinition));
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

  installToolbarButtons: function() {
    var extraItems = this.toolbarItemIDs.join(',');
    var toolbar = this.toolbar;
    var matcher = /\b(hdrReplyToSenderButton,hdrSmartReplyButton|hdrReplyToSenderButton|hdrSmartReplyButton|hdrForwardButton)\b/;
    var defaultset = toolbar.getAttribute('defaultset');
    if (matcher.test(defaultset))
      toolbar.setAttribute('defaultset', defaultset.replace(matcher, '$1,' + extraItems));
    else
      toolbar.setAttribute('defaultset', defaultset + ',' + extraItems);
  }
};

window.addEventListener('DOMContentLoaded', function TypicalReplyButtonsSetup() {
  window.removeEventListener('DOMContentLoaded', TypicalReplyButtonsSetup, false);

  TypicalReplyButtons.buildUI();
  TypicalReplyButtons.installToolbarButtons();
}, false);
