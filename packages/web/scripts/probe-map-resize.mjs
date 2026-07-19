import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto("http://127.0.0.1:3050/", { waitUntil: "domcontentloaded" });
const begin = page.getByRole("button", { name: /BEGIN/i });
if (await begin.count()) await begin.first().click({ force: true });
await page.waitForTimeout(3200);

const measure = () =>
  page.evaluate(() => {
    const p = document.querySelector(".map-panel");
    const w = document.querySelector(".map-workspace");
    return {
      dims: document.querySelector(".mw-dims")?.textContent,
      panel: {
        w: p?.getBoundingClientRect().width,
        h: p?.getBoundingClientRect().height,
      },
      ws: {
        w: w?.getBoundingClientRect().width,
        h: w?.getBoundingClientRect().height,
      },
      panelInline: p
        ? { w: p.style.width, h: p.style.height, maxH: p.style.maxHeight }
        : null,
      custom: p?.classList.contains("map-panel-custom-h"),
    };
  });

const before = await measure();
await page.locator('.mw-tools button[title="Larger window"]').click();
await page.waitForTimeout(80);
await page.locator('.mw-tools button[title="Larger window"]').click();
await page.waitForTimeout(150);
const afterPlus = await measure();

const handle = page.locator(".mw-handle.s.dock");
const box = await handle.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 160, { steps: 12 });
  await page.mouse.up();
}
await page.waitForTimeout(200);
const afterDrag = await measure();

// width drag
const eHandle = page.locator(".mw-handle.e.dock");
const eb = await eHandle.boundingBox();
if (eb) {
  await page.mouse.move(eb.x + 2, eb.y + eb.height / 2);
  await page.mouse.down();
  await page.mouse.move(eb.x + 120, eb.y + eb.height / 2, { steps: 10 });
  await page.mouse.up();
}
await page.waitForTimeout(200);
const afterWidth = await measure();

console.log(JSON.stringify({ before, afterPlus, afterDrag, afterWidth }, null, 2));
await browser.close();
