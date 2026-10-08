"use client";

import { useEffect } from "react";

export function SettingsPopoverDismiss() {
  useEffect(() => {
    const closeOpenPopovers = (target: EventTarget | null) => {
      if (target instanceof Element && target.closest("details.settings-create")) return;
      document.querySelectorAll<HTMLDetailsElement>("details.settings-create[open]").forEach((popover) => popover.removeAttribute("open"));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOpenPopovers(null);
    };
    const handlePointerDown = (event: PointerEvent) => closeOpenPopovers(event.target);

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
