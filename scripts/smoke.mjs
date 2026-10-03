// End-to-end smoke test: plays one Write and one Break lesson in offline mode
// and saves screenshots. Needs a running server (npm run build && npm start).
//   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOTS ?? "screenshots";
const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath });
let failures = 0;
const settle = (page) => page.waitForTimeout(1200);
const expect = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else console.log("ok:", msg);
};

async function run(name, viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => {
    failures++;
    console.error("page error:", e.message);
  });

  // Home
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Writing" }).waitFor();
  expect(await page.getByText("Say it plainly").isVisible(), `${name}: unit banner visible`);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: true });

  // Write lesson: EARS auto-lock door (2 steps)
  await page.goto(`${BASE}/lesson/ears`);
  const box = page.getByLabel("Your answer");
  await box.fill("The door should lock after a while.");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Try again" }).waitFor();
  expect(await page.locator("mark").count() > 0, `${name}: bad answer gets highlighted spans`);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-write-fail.png`, fullPage: true });
  await page.getByRole("button", { name: "Try again" }).click();
  await box.fill("When the door has been closed for 30 seconds, the door controller shall lock the door.");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Continue" }).waitFor();
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-write-pass.png`, fullPage: true });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your answer").fill("While the drone is in flight, when the battery charge falls below 20%, the drone shall return to the launch point.");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Lesson complete!").waitFor();
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-complete.png`, fullPage: true });

  // Break lesson: password reset
  await page.goto(`${BASE}/lesson/break-reset`);
  const input = page.getByPlaceholder("Add a corner case...");
  for (const c of ["How long until the link expires?", "What if the email is not registered?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Keep hunting" }).waitFor();
  expect(await page.getByText("2/8 caught").first().isVisible(), `${name}: partial score shown`);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-break-retry.png`, fullPage: true });
  await page.getByRole("button", { name: "Keep hunting" }).click();
  for (const c of ["If I request a reset twice, does the old link still work?", "Can the same link be used twice?", "Are my other sessions logged out?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByText("You missed these").waitFor();
  expect(await page.getByText("You missed these").isVisible(), `${name}: missed cases revealed after pass`);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-break-pass.png`, fullPage: true });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Lesson complete!").waitFor();

  // Back home: progress persisted
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Writing" }).waitFor();
  const xp = await page.getByTitle("Total XP").innerText();
  expect(Number(xp.trim()) > 0, `${name}: XP saved (${xp.trim()})`);
  await page.getByRole("button", { name: "Spec" }).click();
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-home-spec.png`, fullPage: true });
  await page.goto(`${BASE}/about`);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}-about.png`, fullPage: true });
  await ctx.close();
}

await run("mobile", { width: 390, height: 844 });
await run("desktop", { width: 1280, height: 860 });
await browser.close();
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("Smoke test passed. Screenshots in", OUT);
