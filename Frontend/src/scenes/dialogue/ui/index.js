import { dialogueSceneButtonMethods } from './buttons.js';
import { dialogueSceneHotkeyMethods } from './hotkeys.js';
import { dialogueSceneLayoutMethods } from './layout.js';

export const dialogueSceneUiMethods = Object.assign(
  {},
  dialogueSceneLayoutMethods,
  dialogueSceneHotkeyMethods,
  dialogueSceneButtonMethods
);
