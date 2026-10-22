import Link from "next/link";
import { BellRingIcon, DownloadIcon, MapPinIcon, MoonIcon, PlayIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Debug-signed APK served from public/downloads (copied from the debug build after `bun run android:sync` and `gradlew assembleDebug`).
const APK_DOWNLOAD_URL: string | null = "/downloads/arrival-alarm.apk";

const STEPS = [
  {
    icon: MapPinIcon,
    title: "목적지를 핀으로 찍기",
    description: "지도를 누르거나 주소·역 이름을 검색해 목적지를 정하고, 알림 반경을 미터 단위로 조절합니다. 목적지는 여러 곳 둘 수 있습니다.",
  },
  {
    icon: PlayIcon,
    title: "가동하기",
    description: "가동하면 기기가 줄 수 있는 가장 정확한 위치로 추적하고, 목적지마다 남은 거리를 보여 줍니다. 가동 전에는 위치를 추적하지 않습니다.",
  },
  {
    icon: BellRingIcon,
    title: "반경에 들어오면 알림",
    description: "끄기나 보류를 고를 때까지 소리, 진동, 팝업으로 계속 알립니다. 보류하면 반경을 벗어났다 다시 들어올 때 다시 알립니다.",
  },
];

const FEATURES = [
  {
    icon: MoonIcon,
    title: "화면이 꺼져 있어도",
    description: "Android 앱은 백그라운드나 화면이 꺼진 상태에서도 알립니다. 방해금지와 무음 설정은 그대로 존중합니다.",
  },
  {
    icon: ShieldCheckIcon,
    title: "위치는 기기에만",
    description: "목적지와 설정은 기기에만 저장하고, 현재 위치를 어디에도 보내지 않습니다. 검색어만 지도 검색 서비스로 전달됩니다.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <section className="flex flex-col gap-6">
        <Badge variant="outline">Android 앱 · 웹</Badge>
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance">도착 알림</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            지하철이나 버스에서 잠들어도 내릴 곳을 놓치지 않게, 정해 둔 목적지 반경에 들어오면 확실히 알려 드립니다.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {APK_DOWNLOAD_URL ? (
            <a className={buttonVariants({ size: "lg" })} href={APK_DOWNLOAD_URL} download>
              <DownloadIcon data-icon="inline-start" />
              Android 앱 내려받기 (APK)
            </a>
          ) : (
            <Button size="lg" disabled>
              <DownloadIcon data-icon="inline-start" />
              Android 앱 준비 중
            </Button>
          )}
          <Link className={buttonVariants({ size: "lg", variant: "outline" })} href="/app">
            웹에서 바로 써 보기
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          웹에서는 화면을 켜 둔 동안에만 알림이 옵니다. 화면이 꺼져도 알림을 받으려면 Android 앱을 쓰세요.
        </p>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="font-heading text-xl font-semibold">
          이렇게 씁니다
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card size="sm" className="h-full">
                <CardHeader>
                  <step.icon className="size-5 text-primary" aria-hidden />
                  <CardTitle>
                    {index + 1}. {step.title}
                  </CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="특징">
        {FEATURES.map((feature) => (
          <Card key={feature.title} size="sm">
            <CardHeader>
              <feature.icon className="size-5 text-primary" aria-hidden />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}
