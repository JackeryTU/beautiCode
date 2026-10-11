// Minimal rendering contracts observed in official DSH Desktop 0.2.0-rc.2's
// ui-plugin-manager and ui-theme. Classes below are fixture-owned, not selectors
// for production. Keep semantic data-* keys, negative margins and theme colors
// aligned with the host when its UI changes (issue #92 / ADR 0002).
export const hostCss = `
body{margin:0;font:14px/20px sans-serif;
  --dsw-static-neutral-bluish-800:#353638;--dsw-static-neutral-bluish-00:#fff;
  --dsw-radius-xl:16px;--dsw-alias-label-primary:#f9fafb;
  --dsw-alias-label-secondary:#cfd3d6;--dsw-alias-label-tertiary:#adb2b8;
  --dsw-alias-label-caption:#81858c;--dsw-alias-interactive-bg-hover:rgba(255,255,255,.08);
  --dsw-alias-bg-layer-2:#353638;--dsw-specific-input-major:#171b23}
html[data-bc-resolved-tone=light] body{
  --dsw-alias-label-primary:#0f1115;--dsw-alias-label-secondary:#61666b;
  --dsw-alias-label-tertiary:#81858c;--dsw-alias-label-caption:#adb2b8;
  --dsw-alias-interactive-bg-hover:rgba(0,0,0,.04)}
#root{height:800px}
.host-page{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary);
  display:flex;flex-direction:column;align-items:center;gap:32px;padding:0 48px 48px;overflow:auto}
.host-page>*{width:100%;max-width:960px}
.host-head{box-sizing:border-box;display:flex;justify-content:space-between;padding-top:28px}
.host-head h1{margin:0;font-size:20px;font-weight:500;line-height:28px}
.host-intro{color:var(--dsw-alias-label-secondary);font-size:13px}
.host-group{display:flex;flex-direction:column;gap:8px}
.host-group-head{display:flex;gap:8px}
.host-group-head h3{margin:0;font-size:14px;font-weight:500}
.host-count{color:var(--dsw-alias-label-caption)}
.host-cards{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}
.host-card{border-radius:var(--dsw-radius-xl);min-width:0;margin:0 -8px;position:relative}
.host-card:hover{background:var(--dsw-alias-interactive-bg-hover)}
.host-card-head{display:flex;align-items:center;gap:14px;padding:8px}
.host-card-main{flex:1;min-width:0}
.host-description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:18px}
.host-open{background:none;border:0;color:inherit;font:inherit;padding:0;cursor:pointer}
.host-open:after{content:"";position:absolute;inset:0;border-radius:var(--dsw-radius-xl)}
.host-open:focus-visible:after{outline:2px solid #4e9eff;outline-offset:2px}
.host-toggle{position:relative;z-index:1}
.host-detail{display:flex;flex-direction:column;gap:16px}
.host-error{display:flex;flex-direction:column;gap:8px}
[role=dialog]{position:fixed;right:40px;top:80px;padding:20px;background:var(--dsw-alias-bg-layer-2)}
[role=tooltip]{position:fixed;left:12px;bottom:12px;padding:8px}
[data-composer-card]{position:fixed;bottom:12px;right:12px;background:var(--dsw-specific-input-major)}
#wallpaper{position:fixed;inset:0;background:linear-gradient(45deg,#fff,#222);z-index:-1}
`;

export const listHtml = `
<section class="host-page" data-plugin-panel>
  <header class="host-head" data-window-drag><div><h1>Plugins</h1>
    <p class="host-intro">Install and manage plugins</p></div><button id="install">Add plugin</button></header>
  <section class="host-group" data-plugin-scope="global" data-plugin-group="official">
    <div class="host-group-head"><h3>Official</h3><span class="host-count" data-plugin-count>8</span></div>
    <ul class="host-cards"><li class="host-card" data-plugin-item="shell">
      <div class="host-card-head"><div class="host-card-main"><button class="host-open">Shell</button>
      <p class="host-description">Run terminal commands</p></div><input class="host-toggle" type="checkbox" aria-label="Enable shell"></div>
    </li></ul>
  </section>
  <section class="host-group" data-plugin-scope="global" data-plugin-group="bundles">
    <div class="host-group-head"><h3>Installed</h3><span class="host-count" data-plugin-count>1</span></div>
    <ul class="host-cards"><li class="host-card" data-plugin-package="beauticode-dsh">
      <div class="host-card-head"><div class="host-card-main"><button class="host-open">beautiCode</button>
      <p class="host-description">Image and video backgrounds</p></div><input class="host-toggle" type="checkbox" aria-label="Enable beautiCode"></div>
    </li></ul>
  </section>
</section>`;

// Loading, empty and failure roots are siblings of groups, not cards/dialogs.
export const states = {
  loading: '<section data-plugin-loading role="status">Loading plugins</section>',
  empty: '<p>No plugins installed</p>',
  unavailable: '<p role="status">Profile unavailable</p>',
  error: '<div class="host-error"><p role="alert">Unable to load plugins</p><button>Retry</button></div>',
  package: '<div class="host-detail" data-plugin-detail="beauticode-dsh"><h2>beautiCode</h2><p class="host-description">Package detail</p><div data-plugin-config><label>Setting <input></label></div></div>',
  item: '<div class="host-detail" data-plugin-item-detail="shell"><h2>Shell</h2><p class="host-description">Plugin detail</p><div data-plugin-config><label>Setting <input></label></div></div>',
  row: '<div class="host-detail" data-plugin-row-detail="shell#executor"><h2>Executor</h2><p class="host-description">Component detail</p><div data-plugin-config><label>Setting <input></label></div></div>',
};
