# FE_IMPROVE.md — UI/UX Improvement Tickets

> Senior Product Designer review.
> 평가 기준: 상용 프로덕트 수준의 미적 완성도 + 유저 편의성.
> 불필요한 정보를 만들어 넣지 않되, 실제 사용 시 불편한 점과 시각적 결함을 모두 다룬다.

---

## P0 — Critical (Production Blockers)

### FE-I-001: Send 플로우의 자동 실행 제거 — 유저 컨트롤 확보

**현재 문제**
`send/page.tsx`에서 Permit2 서명 완료 후 `step`이 `execute`로 전환되면 `useEffect`가 즉시 `executeUserOp()`를 호출한다. 유저는 Permit2 서명과 UserOp 서명 사이에 아무런 제어권이 없다. 서명 후 "잠깐, 취소하고 싶다"는 순간이 존재하지 않는다.

**개선안**
- `execute` 단계에 "Confirm & Submit" 버튼을 노출하여, 유저가 명시적으로 실행을 트리거하도록 변경.
- 자동 실행 useEffect 제거.
- Review 카드에 최종 gas estimate와 token charge를 다시 한번 요약 표시.

**영향 범위**: `send/page.tsx`, `useSendWizard.ts`

---

### FE-I-002: Modal 포커스 트랩(Focus Trap) 구현

**현재 문제**
`WalletModal`, `NotificationCenter` 패널이 열렸을 때 Tab 키로 뒷 배경 요소에 포커스가 이동할 수 있다. 스크린 리더 사용자와 키보드 유저에게 접근성 문제.

**개선안**
- WalletModal 오픈 시 focus trap 적용 (첫 번째 ↔ 마지막 포커스 가능 요소 간 순환).
- ESC 키 → 모달 닫기 (이미 구현됨, 유지).
- 모달 닫힐 때 트리거 요소로 포커스 복원.
- `aria-modal="true"` + `role="dialog"` (WalletModal에 이미 있음, NotificationCenter에도 적용).
- body scroll lock 추가 (모바일에서 배경 스크롤 방지).

**영향 범위**: `WalletModal.tsx`, `NotificationCenter.tsx`, 공통 유틸 `useFocusTrap` 훅 추가

---

### FE-I-003: 다크 모드 수동 전환 토글 추가

**현재 문제**
다크 모드가 `prefers-color-scheme: dark`에만 의존한다. OS 설정과 다르게 앱에서만 다크 모드를 쓰고 싶은 유저를 지원하지 못한다. 상용 앱에서 필수적인 기능.

**개선안**
- 테마 상태를 `system | light | dark`로 관리하는 `ThemeProvider` 추가.
- `<html>` 태그에 `data-theme="light|dark"` 속성 토글.
- CSS를 `@media (prefers-color-scheme: dark)` → `[data-theme="dark"]` 선택자로 전환하되, `system` 일 때는 미디어 쿼리 사용.
- 토글 UI: GNB 우측에 sun/moon 아이콘 버튼 또는 WalletDropdown 내에 배치.
- 선택값을 `localStorage`에 persist.

**영향 범위**: `globals.css`, `layout.tsx`, `GNB.tsx` 또는 `WalletDropdown.tsx`, 신규 `ThemeProvider.tsx`

---

## P1 — High Priority (Production Quality)

### FE-I-004: 인라인 SVG 아이콘 → 통합 아이콘 시스템

**현재 문제**
모든 컴포넌트에 인라인 `<svg>` 가 산재해 있다. 같은 아이콘(chevron, external-link, close, copy, bell 등)이 미세하게 다른 strokeWidth/size로 반복 정의되어 시각적 일관성이 떨어지고, 유지보수가 어렵다.

**개선안**
- `src/components/ui/Icon.tsx`에 통합 아이콘 컴포넌트 생성.
- 자주 쓰는 아이콘 목록: `chevron-down`, `external-link`, `close`, `copy`, `check`, `bell`, `home`, `send`, `shield`, `clock`, `plus`, `wallet`, `search`, `warning`, `info`.
- 사이즈 prop (`sm: 14px`, `md: 18px`, `lg: 24px`) + `className` 전달.
- 기존 인라인 SVG를 `<Icon name="..." />` 으로 교체.

**영향 범위**: 전체 컴포넌트 (BottomNav, GNB, WalletButton, CopyableHex, FlowResultPanel, Toast, NotificationCenter, HistoryPage 등)

---

### FE-I-005: 스켈레톤 로딩 일관성 확보

**현재 문제**
- `BalancePanel`에만 `Skeleton` 컴포넌트가 적용되어 있다.
- `history/page.tsx`는 빈 배열에서 데이터 로드 시 즉시 리스트가 나타난다 (flash).
- `sponsor/page.tsx`의 campaign status 로딩 시 스켈레톤이 없다.
- `CounterfactualAddress`의 "Deriving..." 텍스트는 skeleton이 더 자연스러움.

**개선안**
- History 페이지: 초기 로드 시 3~4개의 skeleton 아이템 표시.
- Sponsor 페이지: campaign status card에 skeleton 적용.
- CounterfactualAddress: 주소 영역에 skeleton 적용.
- 모든 데이터 패칭 영역에 일관된 skeleton 패턴 적용.

**영향 범위**: `history/page.tsx`, `sponsor/page.tsx`, `CounterfactualAddress.tsx`, `Skeleton.tsx` (확장 필요 시)

---

### FE-I-006: Campaign ID 입력 UX 개선 — 인간이 읽을 수 있는 형태

**현재 문제**
Sponsor 페이지에서 Campaign ID를 `0x` + 64자리 hex로 직접 입력해야 한다. 이것은 개발자용 인터페이스이지 유저용이 아니다. 상용 제품에서는 이런 raw hex를 유저에게 노출하면 안 된다.

**개선안**
- "최근 생성한 캠페인" 드롭다운을 추가. localStorage에 `{id, name, createdAt}[]`로 최근 캠페인 목록을 유지.
- Campaign 생성 성공 시 자동으로 해당 캠페인 선택.
- Campaign ID를 보여줄 때 캠페인 이름 + 말줄임된 ID로 표시 (예: "DotFuel Launch Day (0x3a1f...c42b)").
- 고급 사용자용 "Enter ID manually" 토글은 유지하되 기본 UI가 아니라 collapsible.

**영향 범위**: `sponsor/page.tsx`, `lib/campaign-client.ts` (로컬 캠페인 목록 관리), 신규 `CampaignSelector` 컴포넌트

---

### FE-I-007: Error Recovery UX 강화

**현재 문제**
에러 발생 시 `<ErrorNotice>` 가 빨간 배경에 메시지를 표시하지만, 유저가 "다음에 무엇을 해야 하는지"에 대한 안내가 없다. 또한 네트워크 에러 시 재시도 버튼이 없다.

**개선안**
- 각 에러 유형별 CTA 버튼 추가:
  - 네트워크 에러: "Retry" 버튼
  - 지갑 미연결: "Connect Wallet" 버튼
  - 잔고 부족: 관련 안내 + 잔고 패널로 스크롤
  - 캠페인 비활성: "Create New Campaign" 링크
- `ErrorNotice` 에 optional `action` prop (`{ label: string; onClick: () => void }`) 추가.
- Debug details 섹션은 유지하되, 기본적으로 닫힌 상태로 (이미 `<details>` 사용 중, 유지).

**영향 범위**: `ErrorNotice.tsx`, `uiError.ts` (에러별 action hint 추가), `send/page.tsx`, `sponsor/page.tsx`

---

### FE-I-008: History 페이지 페이지네이션 및 가상 스크롤

**현재 문제**
localStorage에서 최대 100개 트랜잭션을 한 번에 렌더링한다. 실사용 시 100개의 DOM 노드 + 펼치기/접기 상호작용이 성능에 영향을 줄 수 있다. 또한 "더 보기" 없이 100개 제한이 유저에게 알려지지 않는다.

**개선안**
- 초기 로드 시 20개만 표시, 하단에 "Load More" 버튼.
- 혹은 Intersection Observer 기반 무한 스크롤.
- 전체 건수를 필터 영역에 표시 (예: "Token (42)", "Sponsor (12)").
- 100건 제한 도달 시 안내 메시지 ("Oldest transactions are automatically removed").

**영향 범위**: `history/page.tsx`, `txHistory.ts`

---

### FE-I-009: Balance Delta 값의 가독성 개선

**현재 문제**
`BalancePanel`에서 `formatEther(snapshot.eoaPas - previousSnapshot.eoaPas)` 값이 그대로 표시된다. Wei 단위의 미세한 차이가 `0.000000000000001234`처럼 매우 긴 소수점으로 나올 수 있다.

**개선안**
- Delta 값도 `formatAmount` 함수 사용하여 유효 자릿수 제한 (예: 최대 6자리).
- 양수일 때 `+` 접두사 표시.
- 0 변화 시 "No change" 대신 delta 행 자체를 시각적으로 dim 처리.

**영향 범위**: `BalancePanel.tsx`

---

### FE-I-010: 공통 페이지 전환 애니메이션

**현재 문제**
Next.js 페이지 간 전환 시 아무런 전환 효과가 없어 화면이 딱딱하게 바뀐다. `cardEnter` 애니메이션은 있지만 페이지 레벨은 아니다.

**개선안**
- `page-shell` 진입 시 subtle fade-in + translateY 애니메이션 적용 (CSS only).
- 현재 `cardEnter`와 톤을 맞추되 더 가볍게 (`opacity 0→1`, `translateY(8px)→0`, `180ms ease`).
- `prefers-reduced-motion` 존중 (이미 글로벌 규칙 있음).

**영향 범위**: `globals.css` (`.page-shell` 에 진입 애니메이션 추가)

---

### FE-I-011: GNB 스크롤 시 시각적 피드백 강화

**현재 문제**
GNB는 `position: sticky`이고 `backdrop-filter: blur(12px)` + 반투명 배경이 있지만, 스크롤 유무에 따른 시각적 구분이 약하다. 유저가 페이지 최상단에 있는지 스크롤한 상태인지 구분하기 어렵다.

**개선안**
- 스크롤 시 GNB에 `box-shadow`를 추가하여 "떠 있는" 느낌 강화.
- 간단한 `useEffect` + `scroll` 이벤트로 `data-scrolled` 속성 토글.
- CSS: `[data-scrolled] .gnb { box-shadow: var(--shadow-sm); }`.

**영향 범위**: `GNB.tsx`

---

## P2 — Medium Priority (Polish)

### FE-I-012: 토큰 아이콘/로고 시스템

**현재 문제**
`TokenSelector`와 `token-chip`에서 토큰을 심볼의 첫 글자 1자(배경색 원)로 표현한다. 이는 다수 토큰이 추가될 때 구분이 어렵고, 시각적 신뢰감이 떨어진다.

**개선안**
- `TokenOption`에 optional `iconUrl` 필드 추가.
- 아이콘이 있으면 `<img>` 렌더, 없으면 현재의 첫 글자 fallback 유지.
- 잘 알려진 토큰(USDT, USDC, DOT 등)에 대해 내장 아이콘 매핑 제공.
- `next/image`가 static export와 호환되지 않으므로 일반 `<img>` + width/height 지정.

**영향 범위**: `TokenSelector.tsx`, `TokenOption` 타입, `send/page.tsx`

---

### FE-I-013: 첫 방문 온보딩 경험

**현재 문제**
비연결 상태의 홈페이지가 "DotFuel" 히어로 + stat grid + 2개의 모드 카드를 보여주지만, "이게 뭐고 왜 써야 하는지"에 대한 스토리텔링이 부족하다. 상용 앱이라면 유저가 3초 안에 가치를 이해해야 한다.

**개선안**
- Hero 카피를 더 구체적으로: "Gas Required: 0 PAS" stat보다 "어떻게 가능한가"를 3단계로 설명.
  - Step 1: Connect your wallet
  - Step 2: Choose a payment token (e.g., tUSDT)
  - Step 3: Send transactions — gas is settled in your token
- 각 단계에 간결한 일러스트/아이콘.
- "How it works" 섹션을 hero 아래에 추가 (Permit2 flow의 단순화된 다이어그램).

**영향 범위**: `page.tsx` (비연결 상태 UI)

---

### FE-I-014: 빈 상태(Empty State) 일러스트 통일

**현재 문제**
빈 상태 아이콘이 각 페이지마다 다른 인라인 SVG로 구현되어 있다. 스타일이 미세하게 다르고, 일관된 브랜드 아이덴티티가 없다.

**개선안**
- 통일된 빈 상태 일러스트 세트 제작 (최소 4종: empty-tx, empty-campaign, wallet-required, no-results).
- SVG 파일로 `public/illustrations/`에 저장하거나 컴포넌트로 통합.
- `EmptyState` 공통 컴포넌트에 `illustration` prop 추가.

**영향 범위**: `history/page.tsx`, `send/page.tsx`, `sponsor/page.tsx`, 신규 `EmptyState` 공통 컴포넌트

---

### FE-I-015: Form 입력 필드 UX 개선

**현재 문제**
- Sponsor 페이지의 `Budget (PAS)` 입력이 `type="number"` 인데, 브라우저 기본 number stepper가 UX상 불필요하다.
- Duration 필드가 분 단위인데, 유저는 "1시간 30분"을 90으로 계산해야 한다.
- 필드 validation이 submit 시에만 일어나고, 실시간 피드백이 없다.

**개선안**
- Budget 필드: 입력 옆에 "PAS" suffix label 표시. `inputmode="decimal"` 사용.
- Duration: 시간/분 드롭다운 또는 "1h 30m" 형식의 입력 지원. 아니면 프리셋 버튼 (30min, 1hr, 2hr, 24hr).
- 실시간 validation: 값 변경 시 `input--valid` / `input--invalid` 클래스 토글 (Campaign ID 입력에는 이미 적용됨, 나머지 필드에도 확대).

**영향 범위**: `sponsor/page.tsx`

---

### FE-I-016: Responsive 타이포그래피 미세 조정

**현재 문제**
- `--text-hero`가 `clamp(48px, 10vw, 88px)`인데 모바일에서 640px 미만일 때 별도로 `clamp(38px, 15vw, 56px)`로 오버라이드된다. 이 이중 clamp가 예측하기 어렵다.
- `balance-card__value`도 `clamp(24px, 4vw, 34px)` + 420px 미만에서 `clamp(20px, 8vw, 28px)` 이중 적용.

**개선안**
- 단일 clamp 함수로 정리: `clamp(min, preferred, max)` 한 번만 사용.
- hero-title: `clamp(36px, 8vw, 80px)` 하나로 통합.
- balance-card__value: `clamp(20px, 4vw, 34px)` 하나로 통합.
- 미디어 쿼리 오버라이드 제거로 CSS 복잡도 감소.

**영향 범위**: `globals.css`

---

### FE-I-017: Toast 중복 표시 방지

**현재 문제**
`ToastStack`이 queue에 있는 모든 toast를 동시에 렌더링한다. 빠르게 여러 작업을 수행하면 토스트가 쌓여서 화면을 가린다. 또한 같은 내용의 토스트가 중복 표시될 수 있다.

**개선안**
- 최대 동시 표시 개수 제한 (3개).
- 같은 title + kind 조합의 토스트가 queue에 이미 있으면 추가하지 않고 기존 것의 시간만 리셋.
- 초과분은 queue에 대기하다가 앞의 것이 dismiss되면 순차 노출.

**영향 범위**: `ToastContext.tsx`, `ToastStack.tsx`

---

### FE-I-018: 모바일 하단 네비게이션 활성 상태 시각 강화

**현재 문제**
`BottomNav`의 활성 상태가 `color: var(--accent)` 하나뿐이다. 아이콘의 fill이 바뀌지 않고 stroke 색만 변경된다. 엄지로 빠르게 탭할 때 어떤 메뉴가 활성인지 한눈에 파악이 어렵다.

**개선안**
- 활성 아이템에 배경 하이라이트 추가 (subtle pill shape, e.g., `background: rgba(199, 90, 46, 0.1); border-radius: 12px`).
- 활성 아이콘의 fill을 채워서 시각적 무게감 차이.
- 선택적: 활성 전환 시 미세한 scale 애니메이션 (`transform: scale(1.05)`).

**영향 범위**: `BottomNav.tsx`

---

### FE-I-019: WalletDropdown 개선

**현재 문제**
- "Disconnect" 버튼만 있고 "Switch Account" 옵션이 없다.
- 연결된 지갑 유형(MetaMask, WalletConnect 등)을 보여주지 않는다.
- 드롭다운이 닫힐 때 애니메이션 없이 즉시 사라진다.

**개선안**
- 드롭다운 상단에 연결된 커넥터 이름 + 아이콘 표시.
- "Switch Wallet" 버튼 추가 → WalletModal 열기.
- 닫힘 애니메이션 추가 (fade-out + translateY).
- 네트워크 정보 영역에 체인 ID 옆 Blockscout 링크 추가.

**영향 범위**: `WalletDropdown.tsx`, `WalletContext.tsx`

---

### FE-I-020: Send 페이지 — Review 단계의 가스 비교 시각화

**현재 문제**
Review 카드에 "Estimated Cost ≤ X tUSDT"과 "Native Gas: 0 PAS required"가 텍스트로만 나열된다. 유저가 "얼마나 절약하고 있는지"를 직관적으로 느끼기 어렵다.

**개선안**
- "Without DotFuel: ~X PAS needed" vs "With DotFuel: Y tUSDT (0 PAS)" 비교 UI.
- 간단한 가로 바 차트 또는 crossed-out native cost 표시.
- "You save 100% on native gas" 같은 한 줄 요약.

**영향 범위**: `send/page.tsx` (Review 단계)

---

## P3 — Low Priority (Nice to Have)

### FE-I-021: Keyboard Shortcuts

**현재 문제**
키보드 파워유저를 위한 단축키가 없다.

**개선안**
- `Cmd/Ctrl + K`: 글로벌 검색/명령 팔레트 (페이지 이동, 캠페인 검색 등).
- `Cmd/Ctrl + Shift + C`: 현재 선택된 주소 복사.
- GNB에 "?" 키로 단축키 도움말 표시.

**영향 범위**: 신규 `CommandPalette` 컴포넌트, `useHotkeys` 훅

---

### FE-I-022: 트랜잭션 내역 CSV 내보내기

**현재 문제**
History 데이터가 localStorage에만 있고, 외부로 내보낼 방법이 없다.

**개선안**
- History 페이지 상단에 "Export CSV" 버튼 추가.
- 필드: timestamp, mode, tx_hash, gas_cost, settlement, explorer_url.
- `Blob` + `URL.createObjectURL` 로 클라이언트사이드 다운로드.

**영향 범위**: `history/page.tsx`, 신규 `exportCsv` 유틸

---

### FE-I-023: 모바일 Pull-to-Refresh

**현재 문제**
모바일에서 잔고나 캠페인 상태를 새로고침하려면 "Refresh" 버튼을 찾아서 탭해야 한다. 네이티브 앱 사용자에게 익숙한 pull-to-refresh 패턴이 없다.

**개선안**
- 대시보드와 Sponsor 페이지에 pull-to-refresh 제스처 구현.
- 경량 구현: touchstart/touchmove/touchend 이벤트로 threshold 초과 시 refresh 콜백.
- 당기는 중 시각적 피드백 (spinner 아이콘 + 진행률 표시).

**영향 범위**: 신규 `usePullToRefresh` 훅, `page.tsx`, `sponsor/page.tsx`

---

### FE-I-024: Styled-JSX → CSS Modules 마이그레이션

**현재 문제**
컴포넌트 스타일이 `globals.css`(전역)와 `styled-jsx`(컴포넌트 로컬)로 이원화되어 있다. Styled-JSX는:
- 런타임 CSS injection으로 약간의 성능 오버헤드.
- `:global()` 사용이 빈번하여 캡슐화 의미가 퇴색.
- Next.js 생태계에서 점차 비주류화.
- IDE 자동완성과 린팅 지원이 CSS Modules 대비 약함.

**개선안**
- 점진적으로 `styled-jsx` → CSS Modules (`.module.css`) 로 전환.
- `globals.css`의 디자인 토큰(CSS variables)은 유지.
- 전환 우선순위: GNB → Footer → BottomNav → WalletButton → 나머지.

**영향 범위**: 전체 컴포넌트 (대규모 리팩토링, 기능 변경 없음)

---

### FE-I-025: a11y 감사 — 색상 대비 및 ARIA 보완

**현재 문제**
- `--muted: #5e5347`이 `--bg: #f6efe3` 위에서 WCAG AA 4.5:1 대비를 만족하지만, `rgba()` 기반 배경 위에서는 미달할 수 있다.
- 다크 모드의 `--muted: #c8baaa`가 `--bg: #1a1410` 위에서 대비 검증 필요.
- 일부 상태 표시가 색상에만 의존 (예: 성공=초록, 실패=빨강 — 색각 이상 유저).

**개선안**
- 전체 색상 조합을 WCAG AA/AAA 기준으로 감사.
- 대비 미달 시 색상 조정 또는 텍스트 굵기 보정.
- 상태 표시에 색상 + 아이콘/텍스트 레이블 병행 (이미 대부분 적용됨, 누락 부분 보완).
- Budget bar의 색상별 상태(초록/주황/빨강)에 레이블 추가.

**영향 범위**: `globals.css`, `BalancePanel.tsx`, `sponsor/page.tsx`

---

### FE-I-026: 404 Not Found 페이지 개선

**현재 문제**
현재 `not-found.tsx`가 "404" + 설명 + 홈 링크만 있다. 상용 앱 수준에서는 빈약하다.

**개선안**
- 브랜드에 맞는 일러스트 또는 재미있는 카피 추가.
- 인기 페이지 바로가기 링크 (Send, Sponsor, History).
- 검색 바 또는 도움말 링크.

**영향 범위**: `not-found.tsx`

---

### FE-I-027: 홈 Dashboard 레이아웃 — Quick Actions 카드 개선

**현재 문제**
로그인 후 대시보드의 "Quick Actions" 카드가 2개의 링크 버튼만 있다. 상용 앱이라면 유저의 현재 상태에 따른 맥락적 추천이 있어야 한다.

**개선안**
- 스마트 계정이 미배포 상태면: "Deploy your smart account" CTA 강조.
- 토큰 잔고가 0이면: "Get tUSDT to start" 안내.
- 최근 트랜잭션이 실패했으면: "Your last transaction failed — retry?" 표시.
- 활성 캠페인이 있으면: 캠페인 상태 요약 배지.

**영향 범위**: `page.tsx` (대시보드 뷰)

---

### FE-I-028: Sponsor 실행 결과 후 Balance 자동 새로고침 인디케이터

**현재 문제**
Sponsor 트랜잭션 완료 후 `setBalanceRefreshKey(k => k+1)`로 BalancePanel을 새로고침하지만, 유저에게 "잔고가 업데이트되었다"는 시각적 신호가 없다. 숫자만 조용히 바뀐다.

**개선안**
- 잔고 값 변경 시 잠깐 `highlight` 애니메이션 적용 (배경 flash 또는 텍스트 색상 펄스).
- 이미 `useAnimatedNumber`로 숫자 트랜지션이 있으니, 거기에 추가로 카드 테두리 색상 flash를 2초간 적용.
- "Updated just now" 레이블의 시간이 0s로 리셋되는 것이 유일한 신호인데, 이를 더 눈에 띄게.

**영향 범위**: `BalancePanel.tsx`
