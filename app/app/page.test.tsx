import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Home from "@/app/app/page";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("목적지가 없으면 가동하지 않고 이유를 보여준다", () => {
  render(<Home />);

  fireEvent.click(screen.getByRole("button", { name: "가동" }));

  expect(screen.getByRole("alert")).toHaveTextContent("목적지를 하나 이상 추가해야");
  expect(screen.getByText("대기")).toBeInTheDocument();
});

test("위치 권한이 거부되면 가동하지 않고 안내한다", async () => {
  localStorage.setItem(
    "proximity-alarm:destinations",
    JSON.stringify([{ id: "a", name: "강남역", lat: 37.4979, lng: 127.0276, radius: 500 }])
  );
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      watchPosition: (_ok: unknown, fail: (error: GeolocationPositionError) => void) => {
        fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
        return 1;
      },
      clearWatch: vi.fn(),
    },
  });
  vi.stubGlobal("AudioContext", class { resume() { return Promise.resolve(); } });

  // Fresh module so the destination store reads the seeded storage.
  vi.resetModules();
  const { default: FreshHome } = await import("@/app/app/page");
  render(<FreshHome />);
  fireEvent.click(screen.getByRole("button", { name: "가동" }));

  expect(screen.getByRole("alert")).toHaveTextContent("위치 권한이 거부되어");
  expect(screen.getByRole("button", { name: "가동" })).toBeInTheDocument();
});
