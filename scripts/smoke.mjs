// End-to-end smoke test. Plays the real app against a running server and saves screenshots.
//   npm run build && npm start   (optionally with DATABASE_URL and NEXT_PUBLIC_GA_ID set)
//   BASE_URL=http://localhost:3000 node scripts/smoke.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.SHOTS ?? "screenshots";
const executablePath = process.env.CHROMIUM_PATH ?? (fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const QUICK = JSON.parse(fs.readFileSync(new URL("../src/content/challenges/quick.json", import.meta.url), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath });
let failures = 0;
const expect = (cond, msg) => {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else console.log("ok:", msg);
};
const shot = async (page, name) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const norm = (w) => w.toLowerCase().replace(/^[^a-z0-9%]+|[^a-z0-9%]+$/g, "");

/** Answers every quick (choice / tap) step on screen correctly, using the content file. */
async function answerQuickSteps(page) {
  let answered = 0;
  for (;;) {
    await page.locator("main h1").first().waitFor();
    const title = (await page.locator("main h1").first().innerText()).trim();
    const q = QUICK.find((x) => x.title === title);
    if (!q) return answered;
    if (q.kind === "choice") {
      await page.getByRole("radio").nth(q.options.findIndex((o) => o.correct)).click();
    } else {
      const targets = new Set(q.targets.map(norm));
      const words = page.getByRole("group", { name: "Words in the sentence" }).getByRole("button");
      const tokens = q.sentence.split(/\s+/);
      for (let i = 0; i < tokens.length; i++) if (targets.has(norm(tokens[i]))) await words.nth(i).click();
    }
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    answered++;
    await page.waitForTimeout(400);
  }
}

async function run(name, viewport, { desktop }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => {
    failures++;
    console.error("page error:", e.message);
  });

  // ---- Landing + cookie banner ----
  await page.goto(BASE);
  await page.getByRole("heading", { name: /fun way to write/ }).waitFor();
  expect(await page.getByRole("heading", { name: "What is ClarifyMe?" }).isVisible(), `${name}: landing explains the product`);
  const banner = page.getByRole("dialog", { name: "Cookie settings" });
  const hasGA = await banner.waitFor({ timeout: 4000 }).then(() => true, () => false);
  if (hasGA) {
    await shot(page, `${name}-landing-cookie-banner`);
    await banner.getByRole("button", { name: desktop ? "OK" : "Opt out", exact: true }).click();
    const consent = (await ctx.cookies()).find((c) => c.name === "cm_consent")?.value;
    expect(consent === (desktop ? "granted" : "denied"), `${name}: consent cookie saved (${consent})`);
  }
  await shot(page, `${name}-landing`);

  // ---- Onboarding → first lesson ----
  await page.getByRole("link", { name: "Get started" }).first().click();
  await page.getByText("What do you want to get better at?").waitFor();
  await page.getByRole("button", { name: /Writing/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("How much time").waitFor();
  await page.getByRole("button", { name: /15 min/ }).click();
  await shot(page, `${name}-welcome-goal`);
  await page.getByRole("button", { name: "Start my first lesson" }).click();
  await page.getByText("Pick the plain step").waitFor();
  expect(true, `${name}: onboarding opens the first lesson`);
  await shot(page, `${name}-quick-choice`);

  // ---- Write lesson: quick warm-ups, then a failed and a passing answer ----
  await page.goto(`${BASE}/lesson/ears`);
  expect((await answerQuickSteps(page)) === 2, `${name}: answered 2 quick checks`);
  const box = page.getByLabel("Your answer");
  await box.fill("The door should lock after a while.");
  if (desktop) await box.press("Control+Enter");
  else await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /Try again/ }).waitFor();
  expect(await page.locator("mark").count() > 0, `${name}: bad answer gets highlighted spans`);
  await shot(page, `${name}-write-fail`);
  if (desktop) await page.keyboard.press("Enter");
  else await page.getByRole("button", { name: /Try again/ }).click();
  await box.fill("When the door has been closed for 30 seconds, the door controller shall lock the door.");
  if (desktop) await box.press("Control+Enter");
  else await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).waitFor();
  if (desktop) await page.keyboard.press("Enter");
  else await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Your answer").fill("While the drone is in flight, when the battery charge falls below 20%, the drone shall return to the launch point.");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Lesson complete!").waitFor();
  expect(true, `${name}: write lesson completed${desktop ? " with keyboard" : ""}`);
  await shot(page, `${name}-complete`);

  // ---- Break lesson ----
  await page.goto(`${BASE}/lesson/break-reset`);
  await answerQuickSteps(page);
  const input = page.getByPlaceholder("Add a corner case...");
  for (const c of ["How long until the link expires?", "What if the email is not registered?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /Keep hunting/ }).waitFor();
  expect(await page.getByText("2/8").first().isVisible(), `${name}: partial score shown`);
  await page.getByRole("button", { name: /Keep hunting/ }).click();
  for (const c of ["If I request a reset twice, does the old link still work?", "Can the same link be used twice?", "Are my other sessions logged out?"]) {
    await input.fill(c);
    await input.press("Enter");
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("You missed these").waitFor();
  expect(true, `${name}: missed cases revealed after pass`);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Lesson complete!").waitFor();

  // ---- Trial gate (server answer mocked; real limit logic is unit-tested) ----
  await page.route("**/api/sessions", (route) =>
    route.fulfill({ status: 402, contentType: "application/json", body: JSON.stringify({ code: "signin_required", trial: { enabled: true, signedIn: false, used: 10, limit: 10, remaining: 0, requiresSignIn: true } }) }),
  );
  await page.goto(`${BASE}/lesson/bluf`);
  await page.getByText("You finished 10 free lessons!").waitFor();
  expect(true, `${name}: trial gate shown`);
  await page.unroute("**/api/sessions");

  // ---- Path: returning visitors skip the landing page; popover; quests ----
  await page.goto(BASE);
  await page.waitForURL("**/learn");
  expect(true, `${name}: returning visitor goes straight to /learn`);
  const xpBefore = Number((await page.locator('[title="Total XP"]:visible').first().innerText()).trim());
  expect(xpBefore > 0, `${name}: XP saved (${xpBefore})`);
  await page.getByRole("button", { name: /current lesson/ }).first().click();
  expect(await page.getByRole("link", { name: /Start \+\d+ XP/ }).isVisible(), `${name}: node popover with START +XP`);
  await shot(page, `${name}-learn-popover`);
  await page.goto(`${BASE}/quests`);
  const claim = page.getByRole("button", { name: /Claim \d+ XP/ }).first();
  expect(await claim.isVisible().catch(() => false), `${name}: a finished quest can be claimed`);
  await claim.click().catch(() => {});
  await shot(page, `${name}-quests`);
  await page.goto(`${BASE}/profile`);
  await shot(page, `${name}-profile`);
  await page.goto(`${BASE}/history`);
  await page.getByRole("heading", { name: "Review" }).waitFor();
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
