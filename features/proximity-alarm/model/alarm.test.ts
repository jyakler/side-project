import { describe, expect, test } from "vitest";

import { acknowledgeAlarm, advanceAlarms, type AlarmStates } from "./alarm";
import type { Destination } from "./destination";

// Gangnam station area. 0.001 deg of latitude is about 111 m.
const BASE = { lat: 37.4979, lng: 127.0276 };
const north = (meters: number) => ({
  lat: BASE.lat + meters / 111_195,
  lng: BASE.lng,
});

const gangnam: Destination = { id: "a", name: "강남역", ...BASE, radius: 500 };
const far: Destination = {
  id: "b",
  name: "먼 곳",
  ...north(3000),
  radius: 500,
};

function run(destinations: Destination[], positions: { lat: number; lng: number }[], start: AlarmStates = {}) {
  return positions.reduce(
    (states, position) => advanceAlarms(states, destinations, position),
    start
  );
}

describe("반경 진입 알림", () => {
  test("반경 밖에서 안으로 처음 들어오면 그 목적지의 알림이 울린다", () => {
    const outside = run([gangnam], [north(900)]);
    expect(outside.a.status).toBe("watching");

    const inside = advanceAlarms(outside, [gangnam], north(400));
    expect(inside.a.status).toBe("ringing");
  });

  test("끄기나 보류를 고르기 전에는 반경을 벗어나도 계속 울린다", () => {
    const states = run([gangnam], [north(900), north(400), north(900), north(2000)]);
    expect(states.a.status).toBe("ringing");
  });

  test("끄기를 고르면 반경을 벗어났다 다시 들어와도 울리지 않는다", () => {
    const ringing = run([gangnam], [north(900), north(400)]);
    const dismissed = acknowledgeAlarm(ringing, "a", "dismiss");
    expect(dismissed.a.status).toBe("dismissed");

    const after = run([gangnam], [north(2000), north(100)], dismissed);
    expect(after.a.status).toBe("dismissed");
  });

  test("보류하면 반경 안에 머무는 동안에는 다시 울리지 않는다", () => {
    const ringing = run([gangnam], [north(900), north(400)]);
    const snoozed = acknowledgeAlarm(ringing, "a", "snooze");

    const staying = run([gangnam], [north(300), north(450), north(100)], snoozed);
    expect(staying.a.status).toBe("snoozed");
  });

  test("보류 뒤 반경의 20%를 더 벗어났다가 다시 들어오면 다시 울린다", () => {
    const ringing = run([gangnam], [north(900), north(400)]);
    const snoozed = acknowledgeAlarm(ringing, "a", "snooze");

    // 500 m radius: re-entry counts only after going beyond 600 m.
    const left = run([gangnam], [north(650)], snoozed);
    const reentered = advanceAlarms(left, [gangnam], north(450));
    expect(reentered.a.status).toBe("ringing");
  });

  test("보류 뒤 경계 근처에서 안팎을 오가면 다시 울리지 않는다", () => {
    const ringing = run([gangnam], [north(900), north(400)]);
    const snoozed = acknowledgeAlarm(ringing, "a", "snooze");

    const jitter = run(
      [gangnam],
      [north(510), north(490), north(580), north(495), north(560), north(480)],
      snoozed
    );
    expect(jitter.a.status).toBe("snoozed");
  });

  test("한 목적지를 끄거나 보류해도 다른 목적지는 들어갈 때 울린다", () => {
    const destinations = [gangnam, far];
    const firstRinging = run(destinations, [north(900), north(400)]);
    expect(firstRinging.a.status).toBe("ringing");
    expect(firstRinging.b.status).toBe("watching");

    const dismissedFirst = acknowledgeAlarm(firstRinging, "a", "dismiss");
    const atSecond = run(destinations, [north(2000), north(3100)], dismissedFirst);
    expect(atSecond.a.status).toBe("dismissed");
    expect(atSecond.b.status).toBe("ringing");

    const snoozedFirst = acknowledgeAlarm(firstRinging, "a", "snooze");
    const second = run(destinations, [north(2000), north(3100)], snoozedFirst);
    expect(second.b.status).toBe("ringing");
  });

  test("여러 목적지가 동시에 반경 안이면 목적지마다 따로 울린다", () => {
    const near: Destination = { id: "c", name: "근처", ...north(200), radius: 500 };
    const states = run([gangnam, near], [north(1500), north(100)]);
    expect(states.a.status).toBe("ringing");
    expect(states.c.status).toBe("ringing");
  });
});
