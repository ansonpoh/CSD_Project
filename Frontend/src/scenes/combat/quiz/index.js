import { combatSceneQuizCombatMethods } from './quiz_combat.js';
import { combatSceneQuizDataMethods } from './quiz_data.js';
import { combatSceneQuizFlowMethods } from './quiz_flow.js';
import { combatSceneQuizLifelineMethods } from './quiz_lifelines.js';

export const combatSceneQuizMethods = Object.assign(
  {},
  combatSceneQuizDataMethods,
  combatSceneQuizFlowMethods,
  combatSceneQuizCombatMethods,
  combatSceneQuizLifelineMethods
);
