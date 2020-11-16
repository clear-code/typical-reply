/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  log
} from '/common/common.js';
import * as Constants from '/common/constants.js';

browser.runtime.onMessage.addListener((message, _sender) => {
  switch (message && message.type) {
    case Constants.TYPE_DO_BUTTON_COMMAND:
      doButtonCommand(message.id);
      break;
  }
});

function doButtonCommand(id) {
  const definition = (configs.buttons || []).find(definition => definition.id == id);
  log(`doButtonCommand: ${id}`, definition);
  if (!definition)
    return;

  
}
