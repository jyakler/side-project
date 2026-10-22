import { expect, test } from "@playwright/test";

test("소개 페이지에서 웹 앱으로 들어가면 지도와 목적지 설정 화면이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("도착 알림");
  await expect(page.getByRole("link", { name: /Android 앱 내려받기/ })).toHaveAttribute("href", "/downloads/arrival-alarm.apk");

  await page.getByRole("link", { name: "웹에서 바로 써 보기" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("region", { name: "지도" })).toBeVisible();
  await expect(page.getByRole("button", { name: "가동" })).toBeVisible();
});
