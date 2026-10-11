(() => {
  "use strict";
  if (globalThis.BeauticodeReadableSurfaces) return;

  const STORAGE_KEY = "beauticode-readable-surfaces";
  const root = document.documentElement;
  // Only an explicit opt-out disables protection. Missing/corrupt preferences
  // and unavailable storage must not make text behind a panel visible again.
  function readPreference() {
    try {
      return globalThis.localStorage?.getItem(STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  }

  let enabled = readPreference();
  function applyPreference() {
    root.dataset.bcReadableSurfaces = String(enabled);
    globalThis.dispatchEvent?.(new CustomEvent("beauticode-readability-change"));
  }

  const style = document.createElement("style");
  style.dataset.beauticodeReadability = "true";
  style.textContent = `
html[data-bc-active="true"] body{
  --bc-readable-fill:var(--dsw-static-neutral-bluish-800,#232833);
}
html[data-bc-active="true"][data-bc-resolved-tone="light"] body{
  --bc-readable-fill:var(--dsw-static-neutral-bluish-00,#fff);
}
/* DSH settings are body portals; its sticky composer sits over the transcript.
   Protect the actual surface, rather than keying readability to a conversation
   phase or dim preference. Local aliases also beat gallery's body overrides.
   Semantic roles and data-composer-card are shipped DSH contracts, not hashes. */
html[data-bc-active="true"]:not([data-bc-readable-surfaces="false"]) :is(
  [role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],
  [role="tooltip"],[data-composer-card],
  /* DSH pending-interaction panels — user questions, plan review and approval —
     are NOT dialogs. Each is a transparent flex frame wrapping an inner card
     that paints var(--dsw-specific-input-major), the very token this bridge
     re-expresses as translucent, so the transcript bled through the question
     card. Target the inner card by the stable data-* key on its frame (the
     class names are CSS-module hashes and must not be relied on): painting the
     frame instead would produce a solid bar across its side padding. */
  [data-question-key] > section,
  [data-plan-review-key] > section,
  [data-approval-key] > div,
  /* The standalone plugin page has separate reading regions. Keep its frame
     transparent so wallpaper remains visible between groups. Empty/offline
     states are direct paragraphs; failures wrap an alert and retry control. */
  [data-plugin-panel] > header,
  [data-plugin-panel] [data-plugin-group],
  [data-plugin-panel] [data-plugin-detail],
  [data-plugin-panel] [data-plugin-item-detail],
  [data-plugin-panel] [data-plugin-row-detail],
  [data-plugin-panel] [data-plugin-config],
  [data-plugin-panel] [data-plugin-loading],
  [data-plugin-panel] > p,
  [data-plugin-panel] > div:has(> [role="alert"]),
  [data-plugin-panel] [data-plugin-package],
  [data-plugin-panel] [data-plugin-item]
){
  --dsw-alias-bg-base:var(--bc-readable-fill);
  --dsw-alias-bg-layer-1:var(--bc-readable-fill);
  --dsw-alias-bg-layer-2:var(--bc-readable-fill);
  --dsw-alias-bg-layer-3:var(--bc-readable-fill);
  --dsw-alias-bg-overlay:var(--bc-readable-fill);
  --dsw-specific-input-major:var(--bc-readable-fill);
  --dsw-specific-menu:var(--bc-readable-fill);
  --dsw-alias-tooltip-bg:var(--bc-readable-fill);
  background-color:var(--bc-readable-fill);
}
/* Keep host geometry and radii: groups have no padding, so adding a radius
   would expose wallpaper behind the first letter of their heading. */
html[data-bc-active="true"]:not([data-bc-readable-surfaces="false"]) [data-plugin-panel]{
  --dsw-alias-label-tertiary:var(--dsw-alias-label-secondary);
  --dsw-alias-label-caption:var(--dsw-alias-label-secondary);
}
/* Preserve the host's translucent hover feedback over an opaque base. Using
   an image layer leaves the reading plate opaque even in gallery/video mode. */
html[data-bc-active="true"]:not([data-bc-readable-surfaces="false"]) [data-plugin-panel] :is([data-plugin-package],[data-plugin-item]):hover{
  background-image:linear-gradient(var(--dsw-alias-interactive-bg-hover),var(--dsw-alias-interactive-bg-hover));
}
`;
  document.head.append(style);
  applyPreference();

  globalThis.BeauticodeReadableSurfaces = {
    get: () => enabled,
    set(value) {
      if (typeof value !== "boolean") return enabled;
      enabled = value;
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled));
      } catch {
        // Storage can be denied; the current page still honors the selection.
      }
      applyPreference();
      return enabled;
    },
  };
  globalThis.addEventListener?.("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    enabled = readPreference();
    applyPreference();
  });
})();
