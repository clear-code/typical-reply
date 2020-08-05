/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Services } = Components.utils.import('resource://gre/modules/Services.jsm', {});
const { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
const { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});

const bundle = Services.strings.createBundle('chrome://typical-reply/locale/typical-reply.properties');
document.title = bundle.GetStringFromName('configs_title');

const DEFINITION_FIELDS = `
  label
  accesskey
  subjectPrefix
  subject
  body
  bodyImage
  recipients
  quoteType
  forwardType
  priority
  separate
  searchFolder
  searchTargets
  allowedDomains
  autoSend
  icon
`.trim().split(/\s+/);

let mDOMUpdater;

let mDefinitions;
let mAddButton;
let mEditDialogContainer;
let mEditDialogContents;
let mEditSaveButton;
let mEditCancelButton;

window.addEventListener('DOMContentLoaded', async () => {
  const { DOMUpdater } = await import('resource://typical-reply-modules/extlib/dom-updater.js');
  mDOMUpdater = DOMUpdater;

  mDefinitions = document.querySelector('#definitions');
  mDefinitions.addEventListener('dblclick', event => {
    const item = event.target.closest('li');
    if (item)
      shoeEditDialogFor(item.id);
  });
  updateDefinitionsList();

  mAddButton = document.querySelector('#add-item-button');
  mAddButton.textContent = bundle.GetStringFromName('configs_addItem_label');
  setButtonAction(mAddButton, event => {
  });

  mEditDialogContainer = document.querySelector('#edit-dialog-container');
  for (const name of DEFINITION_FIELDS) {
    const field = mEditDialogContainer.querySelector(`[data-field="${name}"]`);
    const labelText = field.closest('label, div').querySelector('.label-text');
    const key = `configs_editField${name.charAt(0).toUpperCase()}${name.substring(1)}_label`;
    labelText.textContent = bundle.GetStringFromName(key);
  }

  mEditSaveButton = document.querySelector('#edit-save-button');
  mEditSaveButton.textContent = bundle.GetStringFromName('configs_editSave_label');
  setButtonAction(mEditSaveButton, event => {
    hideEditDialog();
  });

  mEditCancelButton = document.querySelector('#edit-cancel-button');
  mEditCancelButton.textContent = bundle.GetStringFromName('configs_editCancel_label');
  setButtonAction(mEditCancelButton, event => {
    hideEditDialog();
  });
}, { once: true });

function setButtonAction(button, action) {
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (event.button == 0)
      action(event);
  });
  button.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key == 'Enter')
      action(event);
  });
}


function updateDefinitionsList() {
  const items = TypicalReply.definitions.map(definitionToListItem).join('');
  const range = document.createRange();
  range.selectNode(mDefinitions);
  const after = range.createContextualFragment(`
    <ul id="definitions">${items}</ul>
  `.trim());
  range.detach();
  mDOMUpdater.update(mDefinitions, after);
}

function definitionToListItem(definition) {
  return `
    <li id=${JSON.stringify(sanitizeForHTMLText(definition.type))}>
      <label>${sanitizeForHTMLText(definition.label)}</label>
    </li>
  `.trim();
}


function shoeEditDialogFor(type) {
  const definition = TypicalReply.getDefinition(type);
  for (const name of DEFINITION_FIELDS) {
    const field = mEditDialogContainer.querySelector(`[data-field="${name}"]`);
    switch (field.type) {
      case 'checkbox':
        field.checked = !!definition[name];
        break;

      default:
        field.value = definition[name];
        break;
    }
  }
  mEditDialogContainer.classList.add('shown');
}

function hideEditDialog() {
    mEditDialogContainer.classList.remove('shown');
}


function sanitizeForHTMLText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
