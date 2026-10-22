import { distanceMeters, type Destination, type LatLng } from "./destination";

/**
 * - watching: waiting for the position to enter the radius
 * - ringing: alarm continues until the user dismisses or snoozes
 * - snoozed: silent until the position clearly leaves, then back to watching
 * - dismissed: never rings again for this destination
 */
export type AlarmStatus = "watching" | "ringing" | "snoozed" | "dismissed";

export type AlarmState = { status: AlarmStatus };

export type AlarmStates = Record<string, AlarmState>;

/** After a snooze, re-entry counts only beyond radius × this factor. */
export const REENTRY_EXIT_FACTOR = 1.2;

function nextStatus(status: AlarmStatus, distance: number, radius: number): AlarmStatus {
  switch (status) {
    case "watching":
      return distance <= radius ? "ringing" : "watching";
    case "snoozed":
      return distance > radius * REENTRY_EXIT_FACTOR ? "watching" : "snoozed";
    default:
      return status;
  }
}

export function advanceAlarms(
  states: AlarmStates,
  destinations: Destination[],
  position: LatLng
): AlarmStates {
  const next: AlarmStates = {};
  for (const destination of destinations) {
    const current = states[destination.id]?.status ?? "watching";
    const distance = distanceMeters(position, destination);
    next[destination.id] = { status: nextStatus(current, distance, destination.radius) };
  }
  return next;
}

export function acknowledgeAlarm(
  states: AlarmStates,
  id: string,
  action: "dismiss" | "snooze"
): AlarmStates {
  if (states[id]?.status !== "ringing") return states;
  return { ...states, [id]: { status: action === "dismiss" ? "dismissed" : "snoozed" } };
}
