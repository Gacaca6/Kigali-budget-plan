import { test, expect, type Page } from "@playwright/test";
test("different fares, per-trip spending, editable prices and unexpected income", async ({
  page,
}) => {
  await blank(page);
  await page.getByRole("button", { name: "Plan a cost", exact: true }).click();
  await page.getByLabel("Expense name").fill("Commute");
  await page.getByLabel("Use separate amounts").check();
  await page.getByLabel("Outbound amount", { exact: true }).fill("500");
  await page.getByLabel("Return amount", { exact: true }).fill("800");
  await page.getByLabel("How often?").selectOption("days");
  await page.getByText("Dates & exceptions", { exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-10-01");
  await expect(page.locator(".calculation")).toContainText("28,600");
  await page.getByRole("button", { name: "Add to my plan" }).click();
  await page
    .getByRole("button", { name: "Add unexpected income", exact: true })
    .click();
  await expect(page.getByLabel("Income source", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("Amount", { exact: true }).fill("40000");
  await page.getByLabel("Note (optional)").fill("Unexpected gift");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("11,400");
  await record(page);
  await page
    .getByLabel("Category or planned cost")
    .selectOption({ label: "Commute · Outbound" });
  await page.getByLabel("Amount", { exact: true }).fill("700");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("11,200");
  await record(page);
  await page
    .getByLabel("Category or planned cost")
    .selectOption({ label: "Commute · Return" });
  await page.getByLabel("Date", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("11,200");
  await expect(page.locator(".actual-balance")).toContainText("38,500");
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await page.getByRole("button", { name: "Edit Commute" }).click();
  await page.getByLabel("Return amount", { exact: true }).fill("1000");
  await expect(page.locator(".calculation")).toContainText("33,000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("6,800");
  await expect(page.locator(".actual-balance")).toContainText("38,500");
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.getByRole("button", { name: /^Unexpected gift / }).click();
  await page.getByLabel("Amount", { exact: true }).fill("45000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("11,800");
  await expect(page.locator(".actual-balance")).toContainText("43,500");
  await page.screenshot({
    path: "artifacts/different-fares-home.png",
    fullPage: true,
  });
});
test("header and bottom bar stay fixed and mobile screens fill edge to edge", async ({
  page,
}) => {
  await blank(page);
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [430, 932],
    [540, 960],
    [932, 430],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    const initial = await page.evaluate(() => {
      const shell = document
        .querySelector(".app-shell")!
        .getBoundingClientRect();
      const header = document
        .querySelector(".app-header")!
        .getBoundingClientRect();
      const title = document
        .querySelector(".page-heading")!
        .getBoundingClientRect();
      return {
        width: shell.width,
        height: shell.height,
        top: header.top,
        below: title.top >= header.bottom,
        background: getComputedStyle(document.documentElement).backgroundColor,
        shellBackground: getComputedStyle(document.querySelector(".app-shell")!)
          .backgroundColor,
      };
    });
    expect(initial.width).toBe(width);
    expect(initial.height).toBeGreaterThanOrEqual(height);
    expect(initial.top).toBe(0);
    expect(initial.below).toBe(true);
    expect(initial.background).toBe(initial.shellBackground);
    await page.evaluate(() => scrollTo(0, 500));
    const fixed = await page.evaluate(() => ({
      header: document.querySelector(".app-header")!.getBoundingClientRect()
        .top,
      bottom: document.querySelector(".bottom-nav")!.getBoundingClientRect()
        .bottom,
      navWidth: document.querySelector(".bottom-nav")!.getBoundingClientRect()
        .width,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(fixed.header).toBe(0);
    expect(fixed.bottom).toBe(height);
    expect(fixed.navWidth).toBe(width);
    expect(fixed.overflow).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 350));
  await page.screenshot({ path: "artifacts/fixed-header-phone.png" });
});
test("wallet splash transitions into a subtitle-free landing page", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("status", { name: "Opening KoraBudget" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/splash-screen.png" });
  await expect(
    page.getByRole("status", { name: "Opening KoraBudget" }),
  ).toBeHidden();
  await expect(page.locator(".welcome-animation svg")).toBeVisible();
  await page.screenshot({ path: "artifacts/apple-motion-landing.png" });
});
test("reduced motion keeps illustrations static and disables CSS animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Opening KoraBudget" }),
  ).toBeHidden();
  await expect(page.locator(".welcome-animation svg")).toBeVisible();
  expect(
    await page
      .locator(".welcome-animation")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
async function open(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-24T10:00:00+02:00"));
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Opening KoraBudget" }),
  ).toBeHidden();
}
async function blank(page: Page) {
  await open(page);
  await expect(
    page.getByText("Your student routine", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("What should we call you?").fill("Alex");
  await page.getByRole("button", { name: "Create my budget" }).click();
  await expect(page.getByRole("heading", { name: "Hey, Alex." })).toBeVisible();
}
async function settings(page: Page, name: string) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(name) })
    .click();
}
async function record(page: Page) {
  await page
    .getByRole("button", { name: "Record money", exact: true })
    .first()
    .click();
}
async function mode(page: Page, name: "Expected income" | "Money received") {
  await settings(page, "Planning preferences");
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await page.getByRole("button", { name: "Save planning preferences" }).click();
}
async function addWallet(page: Page, name: string) {
  await settings(page, "Manage wallets");
  await page.getByRole("button", { name: "Add wallet", exact: true }).click();
  await page.getByLabel("Wallet name").fill(name);
  await page.getByRole("button", { name: "Save wallet" }).click();
}
test("optional student template, schedules, transfers, backups and offline restart", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !r.url().startsWith("http://localhost:4173")
    )
      external.push(r.url());
  });
  await open(page);
  await page.getByLabel("What should we call you?").fill("Godwin");
  await page.getByRole("button", { name: /Student template/ }).click();
  await page.getByLabel("Bursary amount (optional)").fill("80000");
  await page.getByLabel("Payment covers", { exact: true }).selectOption("2");
  await page.getByLabel("To campus fare").fill("500");
  await page.getByLabel("Return home fare").fill("500");
  await page.getByLabel("Cost per meal").fill("700");
  await page
    .getByText("Have money to start with? (optional)", { exact: true })
    .click();
  await page.getByLabel("Current balance").fill("80000");
  await page.getByLabel("Use this balance in my first month’s plan").uncheck();
  await page.getByRole("button", { name: "Create my budget" }).click();
  await expect(page.locator(".hero-amount")).toContainText("2,600");
  await expect(page.locator(".actual-balance")).toContainText("80,000");
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(
    page.locator(".rule-card").filter({ hasText: "Campus transport" }),
  ).toContainText("1,000 × 22 days");
  await page.getByRole("button", { name: "Edit Campus transport" }).click();
  await page.getByText("Dates & exceptions", { exact: true }).click();
  await page.getByLabel("Skip dates (optional)").fill("2026-10-26");
  await expect(page.locator(".calculation")).toContainText("21 days");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Year", exact: true }).click();
  await expect(page.locator(".year-row")).toHaveCount(12);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("3,600");
  await record(page);
  await page
    .getByLabel("Category or planned cost")
    .selectOption({ label: "Campus transport · To campus" });
  await page.getByLabel("Amount", { exact: true }).fill("500");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("3,600");
  await expect(page.locator(".wallet-card").first()).toContainText("79,500");
  await addWallet(page, "MTN MoMo");
  await record(page);
  await page.getByRole("button", { name: "Transfer", exact: true }).click();
  await page.getByLabel("Amount", { exact: true }).fill("10000");
  await page.getByLabel("To wallet").selectOption({ label: "MTN MoMo" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".wallet-card").first()).toContainText("69,500");
  await expect(page.locator(".wallet-card").nth(1)).toContainText("10,000");
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("button", { name: "Create my first goal" }).click();
  await page.getByLabel("What are you saving for?").fill("Emergency cushion");
  await page.getByLabel("Target amount").fill("30000");
  await page.getByLabel("Already saved").fill("5000");
  await page.getByRole("button", { name: "Create savings goal" }).click();
  await expect(page.locator(".goal-card")).toContainText("Emergency cushion");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Back up my budget/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Delete Emergency cushion" }).click();
  await page.getByRole("button", { name: "Remove item" }).click();
  await expect(page.locator(".goal-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles(path!);
  await page.getByRole("button", { name: "Replace with this backup" }).click();
  await expect(page.locator(".goal-card")).toContainText("Emergency cushion");
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hey, Godwin." }),
  ).toBeVisible();
  await expect(page.locator(".hero-amount")).toContainText("3,600");
  await expect(page.locator(".offline-indicator")).toContainText("Offline");
  await record(page);
  await page.getByLabel("Amount", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("3,400");
  await page.reload();
  await expect(page.locator(".wallet-card").first()).toContainText("69,300");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("multiple income types, received vs expected mode, extra income and coverage", async ({
  page,
}) => {
  await blank(page);
  await expect(page.locator(".hero-amount")).toContainText("0");
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Income source name").fill("My salary");
  await page.getByLabel("Expected amount per payment").fill("30000");
  await page.getByRole("button", { name: "Save income source" }).click();
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Income source name").fill("Weekend projects");
  await page
    .getByLabel("Income type", { exact: true })
    .selectOption("Freelance");
  await page.getByLabel("How often?").selectOption("irregular");
  await page.getByRole("button", { name: "Save income source" }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("0");
  await mode(page, "Expected income");
  await expect(page.locator(".hero-amount")).toContainText("30,000");
  await expect(page.locator(".actual-balance")).toContainText("0");
  await record(page);
  await page.getByRole("button", { name: "Income", exact: true }).click();
  await page
    .getByLabel("Income source", { exact: true })
    .selectOption({ label: "My salary" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("30,000");
  await expect(page.locator(".actual-balance")).toContainText("30,000");
  await record(page);
  await page.getByRole("button", { name: "Income", exact: true }).click();
  await page
    .getByLabel("Income source", { exact: true })
    .selectOption({ label: "Weekend projects" });
  await page.getByLabel("Amount", { exact: true }).fill("15000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("45,000");
  await record(page);
  await page.getByRole("button", { name: "Income", exact: true }).click();
  await page.getByLabel("Amount", { exact: true }).fill("10000");
  await page.getByText(/Budget allocation ·/).click();
  await page.getByLabel("Payment covers", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.locator(".hero-amount")).toContainText("50,000");
  await expect(page.locator(".actual-balance")).toContainText("55,000");
  await mode(page, "Money received");
  await expect(page.locator(".hero-amount")).toContainText("50,000");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".hero-amount")).toContainText("5,000");
  await expect(page.locator(".actual-balance")).toContainText("55,000");
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.screenshot({
    path: "artifacts/inclusive-home.png",
    fullPage: true,
  });
});
test("custom wallets and categories can be added, renamed, reordered and used", async ({
  page,
}) => {
  await blank(page);
  await addWallet(page, "My savings group");
  await settings(page, "Manage wallets");
  await page.getByRole("button", { name: "Move My savings group up" }).click();
  await expect(page.locator(".wallet-edit").first()).toContainText(
    "My savings group",
  );
  await page.locator(".wallet-edit").first().click();
  await page.getByLabel("Wallet name").fill("Community savings");
  await page.getByRole("button", { name: "Save wallet" }).click();
  await expect(page.locator(".wallet-card").first()).toContainText(
    "Community savings",
  );
  await settings(page, "Manage categories");
  await page.getByLabel("New category").fill("Farming");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await record(page);
  await page
    .getByLabel("Category or planned cost")
    .selectOption({ label: "Farming" });
  await page.getByLabel("Amount", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await settings(page, "Manage categories");
  await page
    .getByLabel("Category name Farming", { exact: true })
    .fill("Agriculture");
  await page
    .getByLabel("Category name Farming", { exact: true })
    .press("Enter");
  await expect(
    page.getByLabel("Category name Agriculture", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move Agriculture up" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.locator(".transaction-row").first().click();
  await expect(page.getByLabel("Category or planned cost")).toHaveValue(
    "cat:Agriculture",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(page.locator(".compare-label")).toContainText("Agriculture");
});
test("green wallet branding, optional setup and phone canvas at every width", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator(".wallet-logo")).toHaveCount(1);
  await expect(page.locator(".welcome-animation svg")).toBeVisible();
  await expect(
    page.locator(
      ".onboarding .eyebrow, .welcome-copy, .art-tag, .privacy-line, .edition, .onboarding .choice-cards small",
    ),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".choice-cards")
      .first()
      .getByRole("button", { name: /Start fresh/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "artifacts/welcome-wallet.png",
    fullPage: true,
  });
  await page.getByLabel("What should we call you?").fill("Alex");
  await page
    .getByText("Have money to start with? (optional)", { exact: true })
    .click();
  await page.getByLabel("Current balance").fill("20000");
  await page.getByRole("button", { name: "Create my budget" }).click();
  await expect(page.locator(".hero-amount")).toContainText("20,000");
  await expect(page.locator(".actual-balance")).toContainText("20,000");
  for (const width of [320, 375, 430, 1200]) {
    await page.setViewportSize({ width, height: 850 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    expect(
      await page
        .locator(".app-shell")
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBe(width);
  }
});
