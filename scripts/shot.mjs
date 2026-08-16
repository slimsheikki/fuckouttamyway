// Screenshot the built game via file:// (no server needed). Build with
// BASE_PATH=./ first so asset paths are relative.
//   BASE_PATH=./ npm run build && node scripts/shot.mjs
import { chromium } from "playwright-core";

const EXE = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const OUT = process.env.SHOT_DIR ?? ".";
const URL = "file://" + process.cwd() + "/dist/index.html";

const b = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--allow-file-access-from-files",
  ],
});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on("pageerror", (e) => console.log("pageerror:", e.message));
await p.goto(URL, { waitUntil: "load" });
await p.locator("#screen-btn").waitFor({ state: "visible", timeout: 8000 });
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/shot-intro.png` });
await p.locator("#screen-btn").click();
await p.waitForTimeout(2600);
await p.screenshot({ path: `${OUT}/shot-play1.png` });
for (let i = 0; i < 3; i++) {
  await p.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
  await p.waitForTimeout(220);
}
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/shot-play2.png` });
await b.close();
console.log("shots done ->", OUT);
