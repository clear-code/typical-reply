/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log,
  appendContents,
  sanitizeForHTMLText,
} from '/common/common.js';
import * as Dialog from '/extlib/dialog.js';
import * as Constants from '/common/constants.js';

const container = document.getElementById('commands');
for (const definition of (configs.buttons || [])) {
  if (!definition.quoteType && !definition.forwardType) {
    createButton({
      ...definition,
      id:        `${definition.id}:no-quote`,
      quoteType: Constants.QUOTE_NEVER
    });
    createButton({
      ...definition,
      id:        `${definition.id}:with-quote`,
      quoteType: Constants.QUOTE_ALWAYS,
      label:     `${configs.labelQuotePrefix}${definition.label}${configs.labelQuoteSuffix}`
    });
  }
  else {
    createButton(definition);
  }
}

function createButton(definition) {
  log(`build button: `, definition);
  let label = sanitizeForHTMLText(definition.label);
  if (definition.accesskey) {
    const accesskeyMatcher = definition.accesskey && new RegExp(`^(.*)(${definition.accesskey})(.*)$`, 'i');
    const matched = label.match(accesskeyMatcher);
    if (matched)
      label = `${sanitizeForHTMLText(matched[1])}<key>${sanitizeForHTMLText(matched[2])}</key>${sanitizeForHTMLText(matched[3])}`
    else
      label += `(<key>${sanitizeForHTMLText(definition.accesskey)}</key>)`
  }
  const accesskey = definition.accesskey ? ` accesskey=${JSON.stringify(sanitizeForHTMLText(definition.accesskey))}` : '';
  const source = `
    <li class="flex-box row"
       ><button id=${JSON.stringify('button:' + sanitizeForHTMLText(definition.id))}
                class="flex-box row"
                ${accesskey}
                data-accesskey=${accesskey ? JSON.stringify(sanitizeForHTMLText(definition.accesskey.toLowerCase())) : '""'}
               ><span class="icon flex-box column"
                      style='background-image:url(${JSON.stringify(sanitizeForHTMLText(definition.icon))})'
                     ></span><label class="flex-box column"
                                   ><span>${label}</span></label></button></li>
  `.trim();
  log(' => source: ', source);
  appendContents(container, source);
  Dialog.initButton(container.lastChild, async _event => {
    browser.runtime.sendMessage({
      type: Constants.TYPE_DO_BUTTON_COMMAND,
      params: definition
    });
    window.close();
  });
}

let mLastHoverItem;
let mLastFocusedItem;

container.addEventListener('mouseover', event => {
  setHover(null);
  if (mLastFocusedItem) {
    mLastFocusedItem.blur();
    mLastFocusedItem = null;
  }
  mLastHoverItem = null;
});

window.addEventListener('keydown', event => {
  if (!mLastHoverItem)
    mLastHoverItem = document.querySelector('button:hover');
  switch (event.key) {
    case 'ArrowUp':
      event.stopPropagation();
      event.preventDefault();
      advanceFocus(-1);
      break;

    case 'ArrowDown':
      event.stopPropagation();
      event.preventDefault();
      advanceFocus(1);
      break;

    case 'Home':
      event.stopPropagation();
      event.preventDefault();
      focusTo(container.firstChild.querySelector('button'));
      setHover(null);
      break;

    case 'End':
      event.stopPropagation();
      event.preventDefault();
      focusTo(container.lastChild.querySelector('button'));
      setHover(null);
      break;

    case 'Escape': {
      event.stopPropagation();
      event.preventDefault();
      window.close();
    }; break;

    default:
      if (event.key.length == 1) {
        const item = getNextFocusedItemByAccesskey(event.key);
        log('item for key : ', event.key, item);
        if (item) {
          focusTo(item);
          setHover(null);
          if (getNextFocusedItemByAccesskey(event.key) == item)
            item.click();
        }
      }
      return;
  }
});

function getNextFocusedItemByAccesskey(key) {
  if (!mLastHoverItem)
    mLastHoverItem = document.querySelector('button:hover');
  const current = mLastHoverItem || mLastFocusedItem || container.firstChild.querySelector('button');
  const condition = `@data-accesskey="${key.toLowerCase()}"`;
  return getNextItem(current, condition);
}

function advanceFocus(direction, lastFocused = null) {
  if (!mLastHoverItem)
    mLastHoverItem = document.querySelector('button:hover');
  lastFocused = lastFocused || mLastHoverItem || mLastFocusedItem;
  if (!lastFocused) {
    if (direction < 0)
      mLastFocusedItem = lastFocused = container.firstChild.querySelector('button');
    else
      mLastFocusedItem = lastFocused = container.lastChild.querySelector('button');
  }
  focusTo(direction < 0 ? getPreviousItem(lastFocused) : getNextItem(lastFocused));
  setHover(null);
}

function evaluateXPath(expression, context, type) {
  if (!type)
    type = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;
  try {
    return (context.ownerDocument || context).evaluate(
      expression,
      (context || document),
      null,
      type,
      null
    );
  }
  catch(_e) {
    return {
      singleNodeValue: null,
      snapshotLength:  0,
      snapshotItem:    function() {
        return null
      }
    };
  }
}

function hasClass(className) {
  return `contains(concat(" ", normalize-space(@class), " "), " ${className} ")`;
}

function getPreviousItem(base, condition = '') {
  const extrcondition = condition ? `[${condition}]` : '' ;
  const item = (
    evaluateXPath(
      `ancestor::li/preceding-sibling::li/descendant::button[not(@disabled)]${extrcondition}[1]`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue ||
    evaluateXPath(
      `ancestor::li/following-sibling::li/descendant::button[not(@disabled)]${extrcondition}[last()]`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue ||
    evaluateXPath(
      `ancestor::li/self::li/descendant::button[not(@disabled)]${extrcondition}`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue
  );
  if (window.getComputedStyle(item, null).display == 'none')
    return getPreviousItem(item);
  return item;
}

function getNextItem(base, condition = '') {
  const extrcondition = condition ? `[${condition}]` : '' ;
  const item = (
    evaluateXPath(
      `ancestor::li/following-sibling::li/descendant::button[not(@disabled)]${extrcondition}[1]`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue ||
    evaluateXPath(
      `ancestor::li/preceding-sibling::li/descendant::button[not(@disabled)]${extrcondition}[last()]`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue ||
    evaluateXPath(
      `ancestor::li/self::li/descendant::button[not(@disabled)]${extrcondition}`,
      base,
      XPathResult.FIRST_ORDERED_NODE_TYPE
    ).singleNodeValue
  );
  if (item && window.getComputedStyle(item, null).display == 'none')
    return getNextItem(item);
  return item;
}

function focusTo(item) {
  mLastFocusedItem = mLastHoverItem = item;
  mLastFocusedItem.focus();
  mLastFocusedItem.scrollIntoView({ block: 'nearest' });
}

function setHover(item) {
  for (const item of container.querySelectorAll('button.hover')) {
    if (item != item)
      item.classList.remove('hover');
  }
  if (item)
    item.classList.add('hover');
}


window.focus();
