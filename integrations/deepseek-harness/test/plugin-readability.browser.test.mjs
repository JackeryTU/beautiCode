import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { hostCss, listHtml, states } from "./fixtures/plugin-panel.mjs";

const runtime = process.env.BEAUTICODE_PLAYWRIGHT_MODULE;
const browserTest = runtime ? test : test.skip;
// An unpacked candidate can run the same behavioral test as the source tree.
const plugin = process.env.BEAUTICODE_TEST_PLUGIN_DIR
  ? new URL(`file:///${process.env.BEAUTICODE_TEST_PLUGIN_DIR.replaceAll("\\", "/")}/`)
  : new URL("../", import.meta.url);
const readable = await fs.readFile(new URL("readability.js", plugin), "utf8");
const client = await fs.readFile(new URL("client.js", plugin), "utf8");
const atmosphere = await fs.readFile(new URL("atmosphere.js", plugin), "utf8");
const css = /style.textContent = `([\s\S]*?)`;/;
const clientCss = client.match(css)[1].replaceAll("${CROSSFADE_MS}", "180");
const galleryCss = atmosphere.match(css)[1];

// The plugin page is a page, not a panel: it keeps the translucent surfaces
// client.js publishes and lets the wallpaper read through, exactly like the
// automation-tasks page. Legibility comes from a text halo plus one caption
// tier instead of an opaque plate. Contrast is therefore a property of the
// wallpaper, so the bars below are checked on a mid-tone background that
// matches the case issue #92 reported (measured page background luminance
// L≈0.097); extremes (pure white/black wallpaper) are out of scope by design.
const TITLE_BAR = 5;
const BODY_BAR = 4.2;
const MID_TONE_WALLPAPER = "#555555";

async function fixture(t, { enabled = true, inject = true } = {}) {
  const { chromium } = await import(runtime);
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BEAUTICODE_BROWSER_CHANNEL ? { channel: process.env.BEAUTICODE_BROWSER_CHANNEL } : {}) });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.setContent(`<html data-bc-active="true" data-bc-resolved-tone="dark"><head><style>${hostCss}${clientCss}</style></head>
    <body><div id="wallpaper"></div><div id="root">${listHtml}</div><div data-composer-card>Composer</div></body></html>`);
  await page.evaluate(enabled => {
    // Storage/transport is external to CSS rendering; a real in-memory store
    // lets about:blank exercise preference changes without accessing user data.
    const data = new Map([["beauticode-readable-surfaces", String(enabled)]]);
    Object.defineProperty(globalThis, "localStorage", { value: {
      getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value),
    }, configurable: true });
  }, enabled);
  if (inject) await page.addScriptTag({ content: readable });
  // Later gallery CSS must not weaken independently protected plugin surfaces.
  await page.addStyleTag({ content: galleryCss });
  return page;
}

async function surface(page, selector) {
  return page.locator(selector).evaluate(el => {
    const style = getComputedStyle(el);
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = style.backgroundColor; ctx.fillRect(0, 0, 1, 1);
    return { background: style.backgroundColor, alpha: ctx.getImageData(0, 0, 1, 1).data[3],
      color: style.color, image: style.backgroundImage, filter: style.filter,
      backdrop: style.backdropFilter, radius: style.borderRadius };
  });
}

function luminance(color) {
  // Accept #rgb / #rrggbb as well as rgb()/rgba(): the wallpaper constants below
  // are authored as hex, and a silent NaN here would make a bar assertion pass
  // vacuously or fail for the wrong reason.
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const channels = (hex
    ? (hex[1].length === 3 ? [...hex[1]].map(c => parseInt(c + c, 16)) : [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)))
    : color.match(/[\d.]+/g).slice(0, 3).map(Number)
  ).map(v => {
    const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(foreground, background) {
  const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (a + .05) / (b + .05);
}

/** The halo token and the shadow the page actually paints. */
const halo = page => page.evaluate(() => ({
  token: getComputedStyle(document.body).getPropertyValue("--bc-text-halo").trim(),
  shadow: getComputedStyle(document.querySelector("[data-plugin-panel]")).textShadow,
}));

/** Resolve the secondary tier through a probe, then read the page's own colors. */
const tiers = page => page.evaluate(() => {
  const probe = document.createElement("span");
  probe.style.color = "var(--dsw-alias-label-secondary)";
  document.body.append(probe);
  const secondary = getComputedStyle(probe).color;
  probe.remove();
  return {
    secondary,
    description: getComputedStyle(document.querySelector(".host-description")).color,
    count: getComputedStyle(document.querySelector(".host-count")).color,
  };
});

browserTest("plugin page keeps the wallpaper and the text halo across themes, phases and wallpaper settings (#92)", async t => {
  const page = await fixture(t);
  for (const tone of ["dark", "light"]) for (const phase of ["hero", "active", "settling", "none"])
    for (const gallery of [false, true]) for (const dim of [false, true]) {
      await page.evaluate(({ tone, phase, gallery, dim }) => {
        Object.assign(document.documentElement.dataset, { bcResolvedTone: tone, bcGallery: String(gallery), bcDimUser: String(dim), bcBgBlur: "true" });
        document.querySelector("[data-plugin-panel]").dataset.phase = phase;
        document.documentElement.style.setProperty("--bc-dim", ".8");
        document.documentElement.style.setProperty("--bc-bg-blur", "9px");
        document.querySelector("#wallpaper").style.background = dim ? "white" : "repeating-linear-gradient(45deg,black,white 20px)";
      }, { tone, phase, gallery, dim });
      if (phase === "active" || phase === "settling") assert.equal(await page.evaluate(phase => document.documentElement.matches(`:has(#root [data-phase="${phase}"])`), phase), true);
      for (const selector of ["[data-plugin-panel]>header", "[data-plugin-group=official]", "[data-plugin-group=bundles]", "[data-plugin-item]", "[data-plugin-package]"]) {
        const state = await surface(page, selector);
        assert.equal(state.alpha, 0, `${tone}/${phase}/${gallery}/${dim} ${selector} must keep the wallpaper`);
        assert.equal(state.filter, "none"); assert.equal(state.backdrop, "none");
      }
      assert.equal((await surface(page, "[data-plugin-panel]")).alpha, 0, "page surroundings and gaps retain wallpaper");
      const painted = await halo(page);
      assert.equal(painted.token, tone === "dark" ? "#000" : "#fff", `${tone} halo token follows the tone`);
      assert.notEqual(painted.shadow, "none", `${tone}/${phase}/${gallery}/${dim} text halo must survive`);
      assert.equal(await page.locator("h1").evaluate(el => getComputedStyle(el).textShadow), painted.shadow,
        "headings inherit the page halo");
      const lifted = await tiers(page);
      assert.equal(lifted.description, lifted.secondary, `${tone} descriptions are lifted one tier`);
      assert.equal(lifted.count, lifted.secondary, `${tone} counts are lifted one tier`);
    }
});

browserTest("transparent rows keep text above the contrast the reference page ships", async t => {
  const page = await fixture(t);
  await page.locator("#wallpaper").evaluate((el, color) => { el.style.background = color; }, MID_TONE_WALLPAPER);
  const colors = await page.locator("h1, .host-intro, h3, .host-count, .host-description")
    .evaluateAll(els => els.map(el => getComputedStyle(el).color));
  assert.ok(colors.length >= 5, "fixture exercises titles, intro, group headings, counts and descriptions");
  for (const color of colors)
    assert.ok(contrast(color, MID_TONE_WALLPAPER) >= BODY_BAR, `${color} on ${MID_TONE_WALLPAPER}`);
  const [title] = await page.locator("h1").evaluateAll(els => els.map(el => getComputedStyle(el).color));
  assert.ok(contrast(title, MID_TONE_WALLPAPER) >= TITLE_BAR, `${title} on ${MID_TONE_WALLPAPER}`);
});

browserTest("wallpaper reads through the page instead of being occluded by a plate", async t => {
  const page = await fixture(t);
  const group = page.locator("[data-plugin-group=official]");
  for (const tone of ["dark", "light"]) {
    await page.evaluate(tone => { document.documentElement.dataset.bcResolvedTone = tone; }, tone);
    await page.locator("#wallpaper").evaluate(el => { el.style.background = "white"; });
    const bright = await group.screenshot();
    await page.locator("#wallpaper").evaluate(el => { el.style.background = "black"; });
    assert.notDeepEqual(await group.screenshot(), bright,
      `${tone}: the wallpaper must show through the plugin page`);
  }
});

browserTest("React state replacements stay transparent and keep the halo without re-injection", async t => {
  const page = await fixture(t);
  for (const [name, html] of Object.entries(states)) {
    await page.locator("[data-plugin-panel]").evaluate((el, html) => { el.innerHTML = html; }, html);
    assert.equal((await surface(page, "[data-plugin-panel]>:first-child")).alpha, 0, `${name} keeps the wallpaper`);
    const painted = await halo(page);
    assert.notEqual(painted.shadow, "none", `${name} keeps the halo`);
  }
});

browserTest("bright, dark, complex and playing video backgrounds keep the page transparent", async t => {
  const page = await fixture(t);
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 200;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0, 0, 320, 200);
    const video = document.createElement("video"); video.muted = true;
    video.srcObject = canvas.captureStream(10); video.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1";
    document.body.prepend(video); await video.play();
  });
  assert.equal(await page.locator("video").evaluate(el => el.paused), false);
  for (const tone of ["dark", "light"]) for (const blur of [false, true])
    for (const background of ["white", "black", "repeating-linear-gradient(45deg,red,white 20px)", "video"]) {
      await page.evaluate(({ tone, blur, background }) => {
        Object.assign(document.documentElement.dataset, { bcResolvedTone: tone, bcBgBlur: String(blur) });
        document.querySelector("#wallpaper").style.background = background === "video" ? "transparent" : background;
        document.querySelector("video").hidden = background !== "video";
      }, { tone, blur, background });
      for (const selector of ["[data-plugin-panel]>header", "[data-plugin-group=official]", "[data-plugin-package]"])
        assert.equal((await surface(page, selector)).alpha, 0, `${tone}/${blur}/${background} ${selector}`);
      const painted = await halo(page);
      assert.equal(painted.token, tone === "dark" ? "#000" : "#fff", `${tone}/${blur}/${background} halo token`);
      assert.notEqual(painted.shadow, "none", `${tone}/${blur}/${background} halo`);
    }
});

browserTest("disabled protection and clearing wallpaper restore host appearance and typography", async t => {
  const baseline = await fixture(t, { inject: false });
  const page = await fixture(t, { enabled: false });
  // Locators for repeated descriptions must identify the intended card.
  const snapshot = async page => Promise.all(["[data-plugin-panel]>header", "[data-plugin-group=official]", "[data-plugin-package]", "[data-plugin-package] .host-description", "[data-plugin-group=official] .host-count"].map(selector => surface(page, selector)));
  assert.deepEqual(await snapshot(page), await snapshot(baseline));
  assert.deepEqual(await tiers(page), await tiers(baseline), "protection off must restore host typography");
  await page.evaluate(() => globalThis.BeauticodeReadableSurfaces.set(true));
  assert.equal((await surface(page, "[data-plugin-package]")).alpha, 0, "the card still keeps the wallpaper");
  assert.notDeepEqual(await tiers(page), await tiers(baseline), "protection lifts captions one tier");
  await page.evaluate(() => { document.documentElement.dataset.bcActive = "false"; document.documentElement.dataset.bcGallery = "false"; });
  await baseline.evaluate(() => { document.documentElement.dataset.bcActive = "false"; document.documentElement.dataset.bcGallery = "false"; });
  assert.deepEqual(await snapshot(page), await snapshot(baseline));
  assert.deepEqual(await tiers(page), await tiers(baseline));
  await page.evaluate(() => { document.documentElement.dataset.bcActive = "true"; globalThis.BeauticodeReadableSurfaces.set(false); });
  assert.equal((await surface(page, "[data-plugin-package]")).alpha, 0);
});

browserTest("transparent rows preserve geometry, card hover, keyboard focus and controls", async t => {
  const page = await fixture(t, { enabled: false });
  const geometry = () => page.evaluate(() => [...document.querySelectorAll("[data-plugin-panel],header,[data-plugin-group],[data-plugin-package],[data-plugin-item]")]
    .map(el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
  const before = await geometry();
  await page.evaluate(() => globalThis.BeauticodeReadableSurfaces.set(true));
  assert.deepEqual(await geometry(), before);
  const normal = await surface(page, "[data-plugin-package]");
  await page.locator("[data-plugin-package]").hover();
  const hover = await surface(page, "[data-plugin-package]");
  assert.notEqual(hover.background, normal.background, "host hover feedback survives");
  assert.ok(hover.alpha > 0 && hover.alpha < 255, `hover stays translucent: ${hover.background}`);
  await page.getByRole("checkbox", { name: "Enable beautiCode" }).check();
  assert.equal(await page.getByRole("checkbox", { name: "Enable beautiCode" }).isChecked(), true);
  await page.keyboard.press("Tab");
  await page.getByRole("button", { name: "beautiCode", exact: true }).focus();
  assert.notEqual(await page.locator("[data-plugin-package] .host-open").evaluate(el => getComputedStyle(el, "::after").outlineStyle), "none");
  const card = await page.locator("[data-plugin-package]").boundingBox();
  const group = await page.locator("[data-plugin-group=bundles]").boundingBox();
  assert.ok(card.x < group.x, "fixture exercises the host's negative card margin");
  assert.equal(normal.radius, "16px");
  await page.locator("[data-plugin-panel]").evaluate(el => { el.insertAdjacentHTML("beforeend", '<section data-plugin-group="more" style="min-height:900px">More plugins</section>'); el.scrollTop = 100; });
  assert.ok(await page.locator("[data-plugin-panel]").evaluate(el => el.scrollTop > 0));
  await page.locator("body").evaluate(el => el.insertAdjacentHTML("beforeend", '<div role="dialog"><button>Install</button></div><div role="tooltip">Hint</div>'));
  assert.equal((await surface(page, "[role=dialog]")).alpha, 255);
  assert.equal((await surface(page, "[role=tooltip]")).alpha, 255);
  assert.equal(await page.locator("[data-plugin-panel]>header").getAttribute("data-window-drag"), "");
});
