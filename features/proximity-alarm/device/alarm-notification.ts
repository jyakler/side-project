import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * System notification for a ringing alarm in the native app, so it reaches the
 * user in the background or with the screen off. The channel carries sound and
 * vibration; Android itself mutes them under do-not-disturb or silent mode.
 */

const CHANNEL_ID = "arrival-alarm";
const ACTION_TYPE_ID = "ARRIVAL_ALARM";

export type AlarmAction = "dismiss" | "snooze" | "open";

const isNative = () => Capacitor.isNativePlatform();

// Stable positive 31-bit id per destination so re-posts replace the same notification.
function notificationId(destinationId: string) {
  let hash = 0;
  for (const char of destinationId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) || 1;
}

let prepared: Promise<void> | null = null;

/** Creates the channel and actions. Permission is asked at app launch (PermissionGate). */
export function prepareAlarmNotifications(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  prepared ??= (async () => {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "도착 알림",
      description: "목적지 반경에 들어왔을 때 울리는 알림",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: ACTION_TYPE_ID,
          actions: [
            { id: "dismiss", title: "끄기" },
            { id: "snooze", title: "보류" },
          ],
        },
      ],
    });
  })().catch((error) => {
    prepared = null;
    throw error;
  });
  return prepared;
}

export async function showAlarmNotification(destination: { id: string; name: string }) {
  if (!isNative()) return;
  await prepareAlarmNotifications();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId(destination.id),
        title: `${destination.name} 반경에 들어왔습니다`,
        body: "내릴 준비를 하세요. 끄기 또는 보류를 고르기 전까지 계속 알립니다.",
        channelId: CHANNEL_ID,
        actionTypeId: ACTION_TYPE_ID,
        extra: { destinationId: destination.id },
        ongoing: true,
        autoCancel: false,
        foreground: true,
        isExactNotification: false,
      },
    ],
  });
}

export async function clearAlarmNotification(destinationId: string) {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: notificationId(destinationId) }] });
}

/** Calls back when the user taps "끄기", "보류" or the notification itself. */
export function onAlarmNotificationAction(handler: (destinationId: string, action: AlarmAction) => void) {
  if (!isNative()) return () => {};
  const listener = LocalNotifications.addListener("localNotificationActionPerformed", (performed) => {
    const destinationId = performed.notification.extra?.destinationId;
    if (typeof destinationId !== "string") return;
    const action: AlarmAction =
      performed.actionId === "dismiss" || performed.actionId === "snooze" ? performed.actionId : "open";
    handler(destinationId, action);
  });
  return () => void listener.then((handle) => handle.remove());
}
