import { dialogueScenePaginationMethods } from './pagination.js';
import { dialogueSceneVideoControlMethods } from './video_controls.js';
import { dialogueSceneVideoLoadingMethods } from './video_loading.js';

export const dialogueSceneMediaMethods = Object.assign(
  {},
  dialogueScenePaginationMethods,
  dialogueSceneVideoControlMethods,
  dialogueSceneVideoLoadingMethods
);
