"use client";

import { PermissionGate } from "./permission-gate";
import { AlarmScreen } from "./proximity-alarm-screen";

export function ProximityAlarmScreen() {
  return (
    <PermissionGate>
      <AlarmScreen />
    </PermissionGate>
  );
}
