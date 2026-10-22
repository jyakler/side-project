"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { BellRingIcon, LocateFixedIcon, SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  checkNativePermissions,
  isNativeApp,
  openAppSettings,
  requestNativePermissions,
  type NativePermissions,
} from "../device/permissions";

const noSubscribe = () => () => {};

/**
 * In the native app, asks for notification and precise location permission at launch
 * and shows the alarm screen only once both are granted. On the web it renders children as is.
 */
export function PermissionGate({ children }: { children: ReactNode }) {
  const native = useSyncExternalStore(noSubscribe, isNativeApp, () => false);
  const [permissions, setPermissions] = useState<NativePermissions | null>(null);
  const [asking, setAsking] = useState(false);

  const request = useCallback(
    () =>
      requestNativePermissions()
        .catch((): NativePermissions => ({ location: false, notifications: false }))
        .then((next) => setPermissions(next)),
    []
  );

  async function askAgain() {
    setAsking(true);
    await request();
    setAsking(false);
  }

  useEffect(() => {
    if (!native) return;
    void request();
    // Re-check when the user comes back from the system settings.
    const recheck = () => {
      if (document.visibilityState === "visible") void checkNativePermissions().then((next) => setPermissions(next));
    };
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, [native, request]);

  if (!native) return children;
  if (permissions?.location && permissions.notifications) return children;

  const checking = permissions === null || asking;
  const missing = [
    permissions && !permissions.location && "정확한 위치",
    permissions && !permissions.notifications && "알림",
  ].filter(Boolean);

  return (
    <main className="flex h-dvh items-center justify-center p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{permissions?.location ? <BellRingIcon /> : <LocateFixedIcon />}</EmptyMedia>
          <EmptyTitle>{checking ? "권한을 확인하고 있습니다" : `${missing.join("과 ")} 권한이 필요합니다`}</EmptyTitle>
          <EmptyDescription>
            도착 알림은 가동한 뒤 정확한 위치로 목적지 반경 진입을 확인하고, 앱이 화면에 없어도 알림으로 알려
            드립니다. 위치는 &lsquo;정확한 위치&rsquo;를 켠 상태로 허용해 주세요.
          </EmptyDescription>
        </EmptyHeader>
        {!checking && (
          <EmptyContent>
            <Button className="w-full" onClick={() => void askAgain()}>
              권한 다시 요청
            </Button>
            <Button variant="outline" className="w-full" onClick={() => void openAppSettings()}>
              <SettingsIcon data-icon="inline-start" />
              설정에서 허용하기
            </Button>
          </EmptyContent>
        )}
      </Empty>
    </main>
  );
}
