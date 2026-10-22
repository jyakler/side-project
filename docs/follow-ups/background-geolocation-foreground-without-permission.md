# 위치 권한 없이 watcher를 추가하면 포그라운드 서비스가 시작되지 않음

- 증상: 가동 시점에 위치 권한이 없으면, 권한을 허용한 뒤에도 앱이 백그라운드로 가면 위치 갱신이 멈추고 상시 알림이 뜨지 않습니다.
- 근거: 2026-10-22 에뮬레이터(Android 35)에서 재현했습니다. `@capacitor-community/background-geolocation` 1.2.26의 `addWatcher`는 권한 요청과 동시에 `startForeground`를 호출하고, 그 예외를 로그로만 남깁니다. 권한이 허용된 뒤 `onPermissionsGranted`는 위치 갱신만 다시 시작합니다.
- 우회: 앱 실행 시 `PermissionGate`가 권한을 먼저 받고, watcher는 `requestPermissions: false`로 추가합니다(`features/proximity-alarm/device/location.ts`).
- 남은 원인: 실행 중에 사용자가 설정에서 권한을 끄고 다시 켜면 같은 문제가 생길 수 있습니다. 플러그인 수정 또는 중지 후 재가동 안내가 다음 단계입니다.
