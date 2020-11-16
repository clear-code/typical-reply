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
  log(`build button: `, definition);
  appendContents(container, `
    <li class="flex-box row"
       ><button id=${JSON.stringify('button:' + sanitizeForHTMLText(definition.id))}
                class="flex-box row"
                accesskey=${JSON.stringify(sanitizeForHTMLText(definition.accesskey))}
               ><span class="icon flex-box column"
                      style='background-image:url(${JSON.stringify(sanitizeForHTMLText(definition.icon))})'
                     ></span><label class="flex-box column"
                                   >${sanitizeForHTMLText(definition.label)}</label></button></li>
  `.trim());
  Dialog.initButton(container.lastChild, async _event => {
    browser.runtime.sendMessage({
      type: Constants.TYPE_DO_BUTTON_COMMAND,
      id:   definition.id
    });
    window.close();
  });
}
