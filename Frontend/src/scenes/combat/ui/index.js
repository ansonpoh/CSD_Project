import { combatSceneUiControlMethods } from './ui_controls.js';
import { combatSceneUiLayoutMethods } from './ui_layout.js';
import { combatSceneUiPanelMethods } from './ui_panels.js';

export const combatSceneUiMethods = Object.assign(
  {},
  combatSceneUiControlMethods,
  combatSceneUiLayoutMethods,
  combatSceneUiPanelMethods
);
