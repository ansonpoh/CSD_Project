const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function wireDomModalA11y(overlay, {
  dialogSelector,
  initialFocusSelector,
  onClose
} = {}) {
  if (!overlay) return () => {};

  const previousActive = document.activeElement;
  const dialog = dialogSelector ? overlay.querySelector(dialogSelector) : overlay;

  const getFocusable = () =>
    Array.from(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || [])
      .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

  const focusInitial = () => {
    const preferred = initialFocusSelector ? overlay.querySelector(initialFocusSelector) : null;
    const focusTarget = preferred || getFocusable()[0] || dialog;
    focusTarget?.focus?.();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusable();
    if (!focusable.length) {
      event.preventDefault();
      dialog?.focus?.();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', onKeyDown);
  setTimeout(focusInitial, 0);

  return () => {
    document.removeEventListener('keydown', onKeyDown);
    if (previousActive?.focus) {
      setTimeout(() => previousActive.focus(), 0);
    }
  };
}

