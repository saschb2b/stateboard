/** Form controls and menus own their keys, including portaled menu options. */
export function isInteractiveKeyEvent(event: KeyboardEvent): boolean {
  const target = event.target instanceof HTMLElement ? event.target : null;
  return Boolean(
    event.defaultPrevented ||
    target?.isContentEditable ||
    target?.closest(
      'input, textarea, select, button, a[href], [role="combobox"], [role="listbox"], [role="option"], [role="menu"], [role="menuitem"]',
    ),
  );
}
