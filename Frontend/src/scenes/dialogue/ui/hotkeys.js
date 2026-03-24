export const dialogueSceneHotkeyMethods = {
  bindSceneHotkeys() {
    this.handleRightKey = () => {
      if (this.isDomInputFocused()) return;
      this.nextPage();
    };

    this.handleLeftKey = () => {
      if (this.isDomInputFocused()) return;
      this.prevPage();
    };

    this.handleSpaceKey = (event) => {
      if (this.isDomInputFocused()) return;
      event.preventDefault();
      this.closeDialogue();
    };

    this.input.keyboard.on('keydown-RIGHT', this.handleRightKey);
    this.input.keyboard.on('keydown-LEFT', this.handleLeftKey);
    this.input.keyboard.on('keydown-SPACE', this.handleSpaceKey);
  },

  unbindSceneHotkeys() {
    this.input?.keyboard?.off('keydown-RIGHT', this.handleRightKey);
    this.input?.keyboard?.off('keydown-LEFT', this.handleLeftKey);
    this.input?.keyboard?.off('keydown-SPACE', this.handleSpaceKey);
  },

  isDomInputFocused() {
    const active = document.activeElement;
    if (!active) return false;

    const tag = active.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      active.isContentEditable
    );
  },

  bindDomInputHotkeyShield(root) {
    if (!root) return;

    const stop = (event) => event.stopPropagation();
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      el.addEventListener('keydown', stop);
      el.addEventListener('keyup', stop);
    });
  },

  suspendDomBlockingKeyCaptures() {
    if (!this.input?.keyboard) return;
    this.input.keyboard.removeCapture(['SPACE', 'LEFT', 'RIGHT', 'UP', 'DOWN']);
  },

  restoreDomBlockingKeyCaptures() {
    if (!this.input?.keyboard) return;
    this.input.keyboard.addCapture(['SPACE', 'LEFT', 'RIGHT', 'UP', 'DOWN']);
  }
};
