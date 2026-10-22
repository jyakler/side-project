# 위치 API가 없는 환경에서 가동이 "위치 확인 중"에 멈춤

- 증상: `navigator.geolocation`이 없는 환경에서 가동하면 경고만 뜨고 상태가 "위치 확인 중"에 머뭅니다.
- 근거: 2026-10-22 `code-review low` 지적. `watchLocation`이 즉시 `unavailable`을 보내면 화면은 경고만 표시합니다(`features/proximity-alarm/ui/proximity-alarm-screen.tsx`의 `start`).
- 추정 원인: 일시적 위치 실패와 위치 API 부재를 같은 `unavailable`로 다룹니다.
- 시도: 없음. 일반 브라우저와 Capacitor WebView에는 위치 API가 있어 주 경로에서는 일어나지 않습니다.
- 다음 단계: 위치 API 부재를 별도 오류로 구분해 가동하지 않고 안내합니다.
