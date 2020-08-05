/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { prefs } = Components.utils.import('resource://typical-reply-modules/prefs.js', {});
const { TypicalReply } = Components.utils.import('resource://typical-reply-modules/TypicalReply.jsm', {});

let mDOMUpdater;
let mDefinitions;

window.addEventListener('DOMContentLoaded', async () => {
  const { DOMUpdater } = await import('resource://typical-reply-modules/extlib/dom-updater.js');
  mDOMUpdater = DOMUpdater;

  mDefinitions = document.getElementById('definitions');
  updateDefinitionsList();
}, { once: true });

function updateDefinitionsList() {
  const items = TypicalReply.definitions.map(definitionToListItem).join('');
  const range = document.createRange();
  range.selectNode(mDefinitions);
  const after = range.createContextualFragment(`
    <ul id="definitions">${items}</ul>
  `.trim());
  range.detach();
  try {
    mDOMUpdater.update(mDefinitions, after);
  }
  catch(error) {
    console.error(error);
  }
}

function definitionToListItem(definition) {
  return `
    <li id=${JSON.stringify(sanitizeForXMLText(definition.type))}>
      <label>${sanitizeForXMLText(definition.label)}</label>
      <button class="delete"></button>
    </li>
  `.trim();
}

function sanitizeForXMLText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
