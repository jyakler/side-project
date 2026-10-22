"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BellRingIcon, LocateFixedIcon, MapPinIcon, PlayIcon, SearchIcon, SquareIcon, Trash2Icon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

import {
  clearAlarmNotification,
  onAlarmNotificationAction,
  prepareAlarmNotifications,
  showAlarmNotification,
} from "../device/alarm-notification";
import { createAlarmSignal } from "../device/alarm-signal";
import { getCurrentLocation, watchLocation } from "../device/location";
import { DestinationMap } from "../map/destination-map";
import { searchPlace } from "../map/place-search";
import { acknowledgeAlarm, advanceAlarms, type AlarmStates, type AlarmStatus } from "../model/alarm";
import { distanceMeters, isValidRadius, type LatLng } from "../model/destination";
import { destinationStore } from "../model/destination-store";
import { RadiusField } from "./radius-field";

type RunState = "idle" | "starting" | "armed";
type Draft = LatLng & { name: string; radius: number };
type SearchState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "found"; name: string }
  | { kind: "not-found"; query: string }
  | { kind: "error" };

const DEFAULT_RADIUS = 500;
const REPOST_INTERVAL_MS = 5000;

const STATUS_LABEL: Record<AlarmStatus, string> = {
  watching: "감시 중",
  ringing: "알림 중",
  snoozed: "보류",
  dismissed: "꺼짐",
};

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function AlarmScreen() {
  const destinations = useSyncExternalStore(
    destinationStore.subscribe,
    destinationStore.getSnapshot,
    destinationStore.getServerSnapshot
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focus, setFocus] = useState<(LatLng & { key: number }) | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const [runState, setRunState] = useState<RunState>("idle");
  const [startError, setStartError] = useState<string | null>(null);
  const [locationWarning, setLocationWarning] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [alarms, setAlarms] = useState<AlarmStates>({});
  const [signal] = useState(createAlarmSignal);
  const stopWatchRef = useRef<(() => void) | null>(null);

  const running = runState !== "idle";
  const ringing = running ? destinations.find((d) => alarms[d.id]?.status === "ringing") : undefined;

  useEffect(() => {
    if (ringing) signal.start();
    else signal.stop();
  }, [ringing, signal]);

  // System notification per ringing destination; re-posted while ringing so it keeps alerting.
  const postedAtRef = useRef(new Map<string, number>());
  useEffect(() => {
    const posted = postedAtRef.current;
    const now = Date.now();
    for (const destination of destinations) {
      const isRinging = running && alarms[destination.id]?.status === "ringing";
      const last = posted.get(destination.id);
      if (isRinging && (last === undefined || now - last >= REPOST_INTERVAL_MS)) {
        posted.set(destination.id, now);
        void showAlarmNotification(destination).catch(() => {});
      } else if (!isRinging && last !== undefined) {
        posted.delete(destination.id);
        void clearAlarmNotification(destination.id).catch(() => {});
      }
    }
  }, [alarms, destinations, running, position]);

  useEffect(
    () =>
      onAlarmNotificationAction((destinationId, action) => {
        if (action === "open") return;
        setAlarms((current) => acknowledgeAlarm(current, destinationId, action));
      }),
    []
  );

  useEffect(
    () => () => {
      stopWatchRef.current?.();
      signal.stop();
    },
    [signal]
  );

  const moveTo = useCallback((point: LatLng) => setFocus({ ...point, key: Date.now() }), []);

  const pickOnMap = useCallback(
    (point: LatLng) => {
      if (running) return;
      setDraft((current) => ({
        ...point,
        name: `목적지 ${destinationStore.getSnapshot().length + 1}`,
        radius: current?.radius ?? DEFAULT_RADIUS,
      }));
    },
    [running]
  );

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    setSearch({ kind: "searching" });
    try {
      const result = await searchPlace(text);
      if (!result) {
        setSearch({ kind: "not-found", query: text });
        return;
      }
      setSearch({ kind: "found", name: result.name });
      moveTo(result);
      if (!running) {
        setDraft((current) => ({ ...result, radius: current?.radius ?? DEFAULT_RADIUS }));
      }
    } catch {
      setSearch({ kind: "error" });
    }
  }

  // One-shot read on the user's request; it never drives the alarm.
  async function showMyLocation() {
    if (running && position) {
      moveTo(position);
      return;
    }
    setLocating(true);
    setLocateError(null);
    try {
      const here = await getCurrentLocation();
      setPosition(here);
      moveTo(here);
    } catch (error) {
      setLocateError(
        error === "permission-denied"
          ? "위치 권한이 거부되어 현재 위치를 표시할 수 없습니다. 브라우저나 기기 설정에서 위치 권한을 허용해 주세요."
          : "현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setLocating(false);
    }
  }

  function addDraft() {
    if (!draft || !isValidRadius(draft.radius)) return;
    destinationStore.set([...destinations, { id: crypto.randomUUID(), ...draft }]);
    setDraft(null);
    setStartError(null);
  }

  function updateRadius(id: string, radius: number) {
    destinationStore.set(destinations.map((d) => (d.id === id ? { ...d, radius } : d)));
  }

  function removeDestination(id: string) {
    destinationStore.set(destinations.filter((d) => d.id !== id));
  }

  function stop() {
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    setRunState("idle");
    setAlarms({});
    setPosition(null);
    setLocationWarning(false);
  }

  function start() {
    if (destinations.length === 0) {
      setStartError("목적지를 하나 이상 추가해야 가동할 수 있습니다.");
      return;
    }
    const invalid = destinations.find((d) => !isValidRadius(d.radius));
    if (invalid) {
      setStartError(`‘${invalid.name}’의 반경이 올바르지 않습니다. 50 m에서 5,000 m 사이로 정해 주세요.`);
      return;
    }

    signal.unlock();
    void prepareAlarmNotifications().catch(() => {});
    setStartError(null);
    setAlarms({});
    setRunState("starting");
    const watched = destinations;
    let denied = false;
    const stopWatch = watchLocation(
      (next) => {
        setRunState("armed");
        setLocationWarning(false);
        setPosition(next);
        setAlarms((current) => advanceAlarms(current, watched, next));
      },
      (error) => {
        if (error === "permission-denied") {
          denied = true;
          stop();
          setStartError(
            "위치 권한이 거부되어 가동할 수 없습니다. 브라우저나 기기 설정에서 이 앱의 위치 권한을 허용한 뒤 다시 가동해 주세요."
          );
        } else {
          setLocationWarning(true);
        }
      }
    );
    // The error callback may fire before the watch is registered.
    if (denied) stopWatch();
    else stopWatchRef.current = stopWatch;
  }

  function acknowledge(action: "dismiss" | "snooze") {
    if (!ringing) return;
    setAlarms((current) => acknowledgeAlarm(current, ringing.id, action));
  }

  return (
    <main className="flex h-dvh flex-col md:flex-row">
      <section className="relative h-[45dvh] shrink-0 md:h-auto md:flex-1" aria-label="지도">
        <DestinationMap
          destinations={destinations}
          draft={draft}
          position={position}
          focus={focus}
          onPick={pickOnMap}
        />
        <Button
          variant="outline"
          size="icon-lg"
          className="absolute right-3 bottom-8 z-[1000] bg-background shadow-md"
          aria-label="현재 위치 보기"
          onClick={showMyLocation}
          disabled={locating}
        >
          <LocateFixedIcon className={locating ? "animate-pulse" : undefined} />
        </Button>
      </section>

      <aside className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:w-96 md:flex-none">
        <header className="flex items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-semibold">도착 알림</h1>
          <Badge variant={running ? "default" : "outline"}>
            {runState === "armed" ? "가동 중" : runState === "starting" ? "위치 확인 중" : "대기"}
          </Badge>
        </header>

        <form onSubmit={runSearch} className="flex flex-col gap-2" role="search">
          <InputGroup>
            <InputGroupInput
              aria-label="주소나 장소 검색"
              placeholder="주소나 역 이름을 입력하세요"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="submit" disabled={search.kind === "searching"}>
                <SearchIcon data-icon="inline-start" />
                검색
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {search.kind === "searching" && "검색 중입니다…"}
            {search.kind === "found" && (
              <>
                찾은 위치: <span className="font-medium text-foreground">{search.name}</span>
              </>
            )}
            {search.kind === "not-found" && `‘${search.query}’에 대한 검색 결과가 없습니다.`}
            {search.kind === "error" && "검색하지 못했습니다. 네트워크 연결을 확인한 뒤 잠시 후 다시 시도해 주세요."}
          </p>
        </form>

        {draft ? (
          <Card size="sm">
            <CardHeader>
              <CardTitle>{draft.name}</CardTitle>
              <CardDescription>이 위치를 확인하고 반경을 정한 뒤 추가하세요.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RadiusField value={draft.radius} onChange={(radius) => setDraft({ ...draft, radius })} />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={addDraft} disabled={!isValidRadius(draft.radius)}>
                  <MapPinIcon data-icon="inline-start" />
                  목적지로 추가
                </Button>
                <Button variant="outline" onClick={() => setDraft(null)}>
                  취소
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          !running && (
            <p className="text-sm text-muted-foreground">
              지도를 눌러 핀을 찍거나 주소를 검색해 목적지를 정하세요.
            </p>
          )
        )}

        <section className="flex flex-col gap-2" aria-label="목적지 목록">
          <h2 className="text-sm font-medium">목적지 {destinations.length}곳</h2>
          {destinations.map((destination) => {
            const status = alarms[destination.id]?.status;
            const distance = position ? distanceMeters(position, destination) : null;
            return (
              <Card key={destination.id} size="sm" aria-label={destination.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="truncate text-left hover:underline"
                      onClick={() => moveTo(destination)}
                    >
                      {destination.name}
                    </button>
                    {running && status && (
                      <Badge variant={status === "ringing" ? "destructive" : "secondary"}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    )}
                  </CardTitle>
                  {running && (
                    <CardDescription>
                      {distance === null
                        ? "남은 거리 확인 중"
                        : distance <= destination.radius
                          ? "반경 안에 있습니다"
                          : `남은 거리 ${formatDistance(distance - destination.radius)}`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-end gap-2">
                  <div className="flex-1">
                    <RadiusField
                      value={destination.radius}
                      onChange={(radius) => updateRadius(destination.id, radius)}
                      disabled={running}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${destination.name} 삭제`}
                    onClick={() => removeDestination(destination.id)}
                    disabled={running}
                  >
                    <Trash2Icon />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {startError && (
          <Alert variant="destructive">
            <AlertTitle>가동할 수 없습니다</AlertTitle>
            <AlertDescription>{startError}</AlertDescription>
          </Alert>
        )}
        {locateError && (
          <Alert variant="destructive">
            <AlertTitle>현재 위치를 표시할 수 없습니다</AlertTitle>
            <AlertDescription>{locateError}</AlertDescription>
          </Alert>
        )}
        {locationWarning && (
          <Alert>
            <AlertTitle>위치를 받지 못하고 있습니다</AlertTitle>
            <AlertDescription>신호가 잡히면 자동으로 다시 확인합니다.</AlertDescription>
          </Alert>
        )}

        <div className="sticky bottom-0 mt-auto bg-background pt-2">
          {running ? (
            <Button size="lg" variant="destructive" className="w-full" onClick={stop}>
              <SquareIcon data-icon="inline-start" />
              중지
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={start}>
              <PlayIcon data-icon="inline-start" />
              가동
            </Button>
          )}
        </div>
      </aside>

      <AlertDialog open={Boolean(ringing)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <BellRingIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>{ringing?.name} 반경에 들어왔습니다</AlertDialogTitle>
            <AlertDialogDescription>
              내릴 준비를 하세요. 끄면 이 목적지의 알림이 끝나고, 보류하면 반경을 벗어났다가 다시 들어올 때 다시
              알립니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => acknowledge("snooze")}>
              보류
            </Button>
            <Button onClick={() => acknowledge("dismiss")}>끄기</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
