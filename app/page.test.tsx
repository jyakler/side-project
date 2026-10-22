import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import LandingPage from "@/app/page";

test("소개 페이지는 앱 설명과 웹 앱 링크, APK 다운로드 링크를 보여준다", () => {
  render(<LandingPage />);

  expect(screen.getByRole("heading", { level: 1, name: "도착 알림" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "웹에서 바로 써 보기" })).toHaveAttribute("href", "/app");
  expect(screen.getByRole("link", { name: /Android 앱 내려받기/ })).toHaveAttribute("href", "/downloads/arrival-alarm.apk");
});
