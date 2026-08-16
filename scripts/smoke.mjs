// Headless smoke test: loads the game, drives it through a full run, and fails
// on any console error / page exception. Not shipped — a dev sanity check.
import { chromium } from "playwright-core";

const URL = process.env.SMOKE_URL ?? "http://localhost:4173/fuckouttamyway/";
const EXE =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const errors = [];
const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(600);

// After BOOT->LOADING->INTRO we should see the timetable panel with a GO button.
const goBtn = page.locator("#screen-btn");
await goBtn.waitFor({ state: "visible", timeout: 5000 });
const introTitle = await page.locator("#screen-title").textContent();
console.log("intro title:", introTitle);

// Start the run.
await goBtn.click();
await page.waitForTimeout(400);
const hudHidden = await page.locator("#hud").evaluate((el) => el.classList.contains("hidden"));
if (hudHidden) errors.push("HUD not shown after GO");
const clock0 = await page.locator("#clock").textContent();

// Drive a couple of lane switches via keyboard.
for (let i = 0; i < 6; i++) {
  await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
  await page.waitForTimeout(120);
}

// Let the whole countdown elapse so we reach RESULT (N<=6 min => <=48s play;
// wait generously but cap).
await page.locator("#screen").waitFor({ state: "visible", timeout: 60000 });
const resultTitle = await page.locator("#screen-title").textContent();
const clock1 = await page.locator("#clock").textContent();
console.log("clock start:", clock0, "-> end:", clock1);
console.log("result title:", resultTitle);
if (!/MADE IT|MISSED IT/.test(resultTitle ?? "")) errors.push("no result screen");

// Replay path.
await page.locator("#screen-btn").click();
await page.waitForTimeout(300);
const back = await page.locator("#screen-title").textContent();
if (!/VUOSAARI/.test(back ?? "")) errors.push("replay did not return to intro");

await browser.close();

if (errors.length) {
  console.error("SMOKE FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("SMOKE OK");
