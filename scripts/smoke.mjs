// End-to-end smoke test. Plays real lessons against a running server and saves screenshots.
//   npm run build && npm start   (optionally with DATABASE_URL and NEXT_PUBLIC_GA_ID set)
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
const shot = async (page, name) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
};

async function run(name, viewport, { desktop }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => {
    failures++;
    console.error("page error:", e.message);
  });

  // ---- Home + cookie banner ----
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Writing" }).waitFor();
  expect(await page.getByText("Say it plainly").isVisible(), `${name}: unit banner visible`);
  const banner = page.getByRole("dialog", { name: "Cookie settings" });
  const hasGA = await banner.waitFor({ timeout: 4000 }).then(() => true, () => false);
  if (hasGA) {
    await shot(page, `${name}-home-cookie-banner`);
    await banner.getByRole("button", { name: desktop ? "OK" : "Opt out", exact: true }).click();
    const consent = (await ctx.cookies()).find((c) => c.name === "cm_consent")?.value;
    expect(consent === (desktop ? "granted" : "denied"), `${name}: consent cookie saved (${consent})`);
    await page.reload();
    await page.getByRole("heading", { name: "Writing" }).waitFor();
    expect(!(await banner.isVisible().catch(() => false)), `${name}: banner stays closed after a choice`);
  }
  if (desktop) {
    expect(await page.getByRole("navigation", { name: "Main" }).first().isVisible(), `${name}: sidebar navigation visible`);
  } else {
    expect(await page.locator("nav[aria-label=Main]").last().isVisible(), `${name}: bottom tab bar visible`);
  }
  await shot(page, `${name}-home`);

  // ---- Write lesson (keyboard on desktop) ----
  await page.goto(`${BASE}/lesson/ears`);
  const box = page.getByLabel("Your answer");
  await box.fill("The door should lock after a while.");
  if (desktop) await box.press("Control+Enter");
  else await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Try again/ }).waitFor();
  expect(await page.locator("mark").count() > 0, `${name}: bad answer gets highlighted spans`);
  await shot(page, `${name}-write-fail`);
  if (desktop) await page.keyboard.press("Enter");
  else await page.getByRole("button", { name: /Try again/ }).click();
  await box.fill("When the door has been closed for 30 seconds, the door controller shall lock the door.");
  if (desktop) await box.press("Control+Enter");
  else await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue/ }).waitFor();
  await shot(page, `${name}-write-pass`);
  if (desktop) await page.keyboard.press("Enter");
  else await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Your answer").fill("While the drone is in flight, when the battery charge falls below 20%, the drone shall return to the launch point.");
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Lesson complete!").waitFor();
  expect(true, `${name}: write lesson completed${desktop ? " with keyboard" : ""}`);
  await shot(page, `${name}-complete`);

  // ---- Break lesson ----
  await page.goto(`${BASE}/lesson/break-reset`);
  const input = page.getByPlaceholder("Add a corner case...");
  for (const c of ["How long until the link expires?", "What if the email is not registered?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: /Keep hunting/ }).waitFor();
  expect(await page.getByText("2/8").first().isVisible(), `${name}: partial score shown`);
  await shot(page, `${name}-break-retry`);
  await page.getByRole("button", { name: /Keep hunting/ }).click();
  for (const c of ["If I request a reset twice, does the old link still work?", "Can the same link be used twice?", "Are my other sessions logged out?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByText("You missed these").waitFor();
  expect(true, `${name}: missed cases revealed after pass`);
  await shot(page, `${name}-break-pass`);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Lesson complete!").waitFor();

  // ---- Trial gate (server answer mocked; real limit logic is unit-tested) ----
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ code: "signin_required", trial: { enabled: true, signedIn: false, used: 10, limit: 10, remaining: 0, requiresSignIn: true } }) }),
  );
  await page.goto(`${BASE}/lesson/bluf`);
  await page.getByText("You finished 10 free lessons!").waitFor();
  expect(await page.getByRole("link", { name: "Create free account" }).isVisible(), `${name}: trial gate shows sign-up`);
  await shot(page, `${name}-trial-gate`);
  await page.unroute("**/api/sessions");

  // ---- Back home: progress persisted ----
  await page.goto(BASE);
  await page.getByRole("heading", { name: "Writing" }).waitFor();
  const xp = await page.locator('[title="Total XP"]:visible').first().innerText();
  expect(Number(xp.trim()) > 0, `${name}: XP saved (${xp.trim()})`);
  await page.getByRole("button", { name: "Spec" }).click();
  await shot(page, `${name}-home-spec`);
  await page.goto(`${BASE}/history`);
  await page.getByRole("heading", { name: "Review" }).waitFor();
  await shot(page, `${name}-history`);
  await page.goto(`${BASE}/privacy`);
  await shot(page, `${name}-privacy`);
  await ctx.close();
}

await run("mobile", { width: 390, height: 844 }, { desktop: false });
await run("desktop", { width: 1440, height: 900 }, { desktop: true });
await browser.close();
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("Smoke test passed. Screenshots in", OUT);
