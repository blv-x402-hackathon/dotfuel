# FE_IMPROVE.md — DotFuel Frontend Improvement Tickets

> **Product Design Review by Senior Product Designer**
> 현재 DotFuel 프론트엔드는 해커톤 데모 수준의 단일 페이지 앱이다.
> 상용 프로덕트로 전환하기 위해 아래 티켓들을 우선순위별로 정리한다.
> 각 티켓은 독립적으로 실행 가능하되, 의존성이 있는 경우 명시한다.

---

## 현재 상태 진단 요약

### 구조적 문제
- **GNB 없음**: 로고가 히어로 섹션에만 존재. 스크롤 시 브랜딩/네비게이션 사라짐
- **지갑 연결이 로컬**: `WalletConnect` 컴포넌트가 hero/sidebar 두 군데 독립 렌더링. 글로벌 상태 없음
- **단일 페이지**: 모든 기능(Balance, Token Flow, Sponsor Console, History)이 하나의 스크롤에 적재
- **SectionNav**: scroll-spy 기반 인라인 네비게이션 → 상용 GNB와 역할 충돌

### 시각 디자인 문제
- 히어로 섹션이 과도하게 크고 데모 전용 언어("Guided Demo Flow", "Quick Demo", "for judges")로 가득함
- 카드가 모두 비슷한 형태 → 정보 위계가 불명확
- 교육용 텍스트가 UI에 직접 노출 ("This is the magic: no native gas needed")
- `StepIndicator`가 데모 가이드 역할인데, 실 사용자에게는 무의미

### UX 문제
- 토큰 선택 UI 없음 (tUSDT 하드코딩)
- 트랜잭션 히스토리에 필터/검색 없음
- 스폰서 콘솔이 메인 플로우에 인라인으로 삽입 → 복잡도 증가
- 모바일에서 사이드바가 스택으로 collapse되면서 핵심 정보(지갑, 스마트 계정) 접근성 떨어짐
- 로딩 스켈레톤 없이 "Pending" 텍스트만 표시
- 에러 바운더리 / 폴백 페이지 없음

---

## P0 — Architecture & Navigation (핵심 구조 변경)

### FE-001: Global Navigation Bar (GNB) 도입

**Goal**: 모든 페이지에서 일관된 브랜딩, 네비게이션, 지갑 상태를 제공하는 GNB 구현

**현재 문제**:
- 로고는 히어로 섹션(`page.tsx:132-141`)에만 존재
- 네트워크 상태 dot은 히어로 eyebrow(`page.tsx:136-137`)에만 표시
- `SectionNav`(`SectionNav.tsx`)는 scroll-spy 인라인 바 → GNB가 아님
- 스크롤하면 브랜드 아이덴티티와 현재 위치 정보가 사라짐

**Scope**:
- `<GNB />` 컴포넌트 신규 생성
- 좌측: LogoMark + "DotFuel" 텍스트 (홈 링크)
- 중앙: 페이지 네비게이션 링크 (Dashboard, Send, Sponsor, History)
- 우측: 네트워크 상태 indicator + WalletButton (FE-002에서 구현)
- `position: sticky; top: 0; z-index: 40;` + backdrop-filter blur
- 모바일: 로고 + 햄버거 메뉴 또는 bottom nav (FE-010)
- 기존 `SectionNav.tsx` 제거 또는 서브 내비게이션으로 전환
- `StepIndicator.tsx` 제거 (데모 전용 컴포넌트)

**AC**:
- [ ] GNB가 모든 페이지 상단에 고정 표시
- [ ] 현재 페이지가 active 상태로 하이라이트
- [ ] 스크롤 시에도 로고, 네비게이션, 지갑 상태 항상 접근 가능
- [ ] 1400px+ / 900px / 600px / 420px 반응형 대응
- [ ] 다크모드 대응

**Depends on**: FE-002
**Removes**: `SectionNav.tsx`, `StepIndicator.tsx`

---

### FE-002: Global Wallet State & Wallet Button

**Goal**: 지갑 연결 상태를 글로벌하게 관리하고, GNB에 통합된 WalletButton으로 통일

**현재 문제**:
- `WalletConnect.tsx`가 `variant="hero"` / `variant="sidebar"` 두 벌로 렌더링
- 지갑 상태가 wagmi hooks 직접 호출로 각 컴포넌트에 분산
- Disconnect 버튼이 사이드바 카드 안에 매몰
- 연결 시 EOA 주소와 Chain ID만 표시 — avatar, ENS, balance 등 없음
- 여러 커넥터가 버튼 리스트로 나열 → 사용자 혼란

**Scope**:
- `WalletProvider` context 또는 Zustand store 생성
  - 상태: `address`, `chainId`, `isConnected`, `connector`, `eoaBalance`
  - 액션: `connect()`, `disconnect()`, `switchChain()`
- `<WalletButton />` 컴포넌트 (GNB 우측에 배치)
  - 미연결: "Connect Wallet" pill 버튼 → 클릭 시 `WalletModal` 오픈
  - 연결: avatar (jazzicon/blockie) + 축약 주소 + 네이티브 잔액 → 클릭 시 dropdown
- `<WalletModal />` 컴포넌트
  - 커넥터 목록 (MetaMask, WalletConnect, Injected) 아이콘 포함
  - 연결 진행 상태 (connecting... / error / retry)
  - 네트워크 불일치 시 자동 switchChain 유도
- `<WalletDropdown />` 컴포넌트
  - EOA 주소 (full + copy)
  - 네트워크 이름 + Chain ID
  - 네이티브 잔액 (PAS)
  - Smart Account 주소 (counterfactual)
  - Explorer 링크
  - Disconnect 버튼
- 기존 `WalletConnect.tsx` 제거
- 히어로 섹션의 지갑 연결 CTA를 WalletButton으로 대체
- 사이드바의 Wallet Session 카드 제거

**AC**:
- [ ] 지갑 연결/해제가 어디서든 한 곳(GNB)에서 가능
- [ ] 모달에 커넥터별 아이콘 + 이름 표시
- [ ] 연결 후 GNB에 avatar + 축약 주소 + 잔액 항상 표시
- [ ] 드롭다운에서 EOA, Smart Account, 네트워크 정보 확인 가능
- [ ] ESC 키, 바깥 클릭으로 모달/드롭다운 닫힘
- [ ] 모바일에서 full-screen 모달로 전환

**Removes**: `WalletConnect.tsx`
**Modifies**: `page.tsx`, `FlowTabs.tsx`, `CounterfactualAddress.tsx`

---

### FE-003: Multi-Page Routing 도입

**Goal**: 단일 페이지 스크롤 구조를 멀티 페이지로 분리하여 각 기능의 깊이를 확보

**현재 문제**:
- `page.tsx` 하나에 Hero + StepIndicator + SectionNav + Balance + Flows + Sponsor Console + History 전부 적재
- 스폰서 콘솔이 token/sponsor 탭 안에 인라인 → 인지 부하 과다
- 히스토리가 FlowTabs 하단에 붙어있어 접근성 낮음
- URL로 특정 기능에 deep link 불가 (id anchor만 존재)

**Scope**:
- Next.js App Router 페이지 분리:
  - `/` — 랜딩/대시보드 (잔액 요약 + 최근 tx + CTA)
  - `/send` — 토큰 모드 실행 (Flow A)
  - `/sponsor` — 스폰서 모드 실행 (Flow B) + 캠페인 관리
  - `/history` — 트랜잭션 전체 히스토리 (필터, 검색, 페이지네이션)
  - `/settings` — 네트워크, 토큰 설정 (향후)
- 공통 레이아웃: `app/layout.tsx`에 GNB + `<main>` + Footer
- 페이지 간 공유 상태: WalletProvider(FE-002), React Query cache
- `output: 'export'` 유지 (정적 빌드)

**AC**:
- [ ] 각 페이지가 독립 URL로 접근 가능
- [ ] GNB에서 페이지 전환 시 active 상태 반영
- [ ] 브라우저 뒤로가기/앞으로가기 정상 동작
- [ ] 지갑 상태가 페이지 전환 시 유지
- [ ] 각 페이지에 적절한 `<title>` + meta 태그

**Depends on**: FE-001, FE-002

---

## P1 — Design System & Component Library

### FE-004: Design Token 체계화 및 Spacing System

**Goal**: CSS 변수를 체계적 design token으로 재정의하고, 일관된 spacing scale 도입

**현재 문제**:
- `globals.css`에 컬러 토큰은 있으나 spacing/radius 토큰 없음
- `padding: 28px`, `gap: 18px`, `margin-top: 16px` 등 매직넘버 산재
- 컴포넌트마다 인라인 `style={{ marginTop: 16 }}` 반복 (최소 8곳)
- border-radius가 16px, 18px, 20px, 22px, 24px, 28px, 999px으로 불규칙

**Scope**:
- Spacing scale: `--space-1: 4px` ~ `--space-12: 48px` (4px grid 기반)
- Radius scale: `--radius-sm: 8px`, `--radius-md: 16px`, `--radius-lg: 24px`, `--radius-full: 999px`
- Typography scale 정리: `--text-xs` ~ `--text-3xl` + line-height/weight pairing
- Color token 확장: surface/on-surface 패턴, interactive/hover/pressed 상태
- Shadow scale: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- 모든 인라인 style을 CSS class로 전환
- Tailwind CSS 도입 검토 (optional — 현재 커스텀 CSS 규모가 크므로)

**AC**:
- [ ] 모든 spacing이 `--space-*` 변수 사용
- [ ] 모든 radius가 `--radius-*` 변수 사용
- [ ] 인라인 `style={}` 0개 (data-driven 동적 스타일 제외)
- [ ] 다크모드 토큰이 semantic name으로 자동 전환

---

### FE-005: 공통 UI 컴포넌트 추출 및 표준화

**Goal**: 반복되는 UI 패턴을 재사용 가능한 컴포넌트로 추출

**현재 문제**:
- `TokenModeFlow.tsx`와 `SponsorModeFlow.tsx`가 거의 동일한 코드 구조 (result panel, timeline, explorer link)
- 버튼 스타일이 className 문자열 조합으로 관리 (`button button--accent`, `button button--ghost`)
- Badge도 동일한 패턴 (`badge badge--success`, `badge--neutral` 등)
- Card 변형이 `card--primary`, `card--info`, `card--data`, `card--log`으로 className 조합
- 폼 필드가 label + input + hint 패턴을 매번 수동 조합

**Scope**:
- `components/ui/` 디렉토리 신규 생성:
  - `Button.tsx` — variant (primary/secondary/ghost/danger), size (sm/md/lg), loading state, icon slot
  - `Card.tsx` — variant (default/primary/info/data), title, subtitle, action slot
  - `Badge.tsx` — variant (success/danger/neutral/accent/polkadot), size
  - `Input.tsx` — label, hint, error, validation state, prefix/suffix
  - `Modal.tsx` — overlay, close handler, size, animation
  - `Dropdown.tsx` — trigger, items, positioning, keyboard nav
  - `Skeleton.tsx` — width, height, variant (text/circle/rect)
  - `Tooltip.tsx` — content, position, delay
- `FlowResultPanel.tsx` 추출 — TokenModeFlow/SponsorModeFlow 공통 결과 패널
- Prop-driven 스타일링으로 className 문자열 조합 제거

**AC**:
- [ ] 모든 버튼이 `<Button>` 컴포넌트 사용
- [ ] 모든 카드가 `<Card>` 컴포넌트 사용
- [ ] TokenModeFlow와 SponsorModeFlow의 result panel 코드 중복 0
- [ ] Storybook 또는 별도 페이지에서 컴포넌트 카탈로그 확인 가능 (optional)

---

### FE-006: Skeleton Loading States

**Goal**: 데이터 로딩 중 skeleton placeholder를 표시하여 perceived performance 향상

**현재 문제**:
- BalancePanel: 연결 전 "Connect wallet" 텍스트, 로딩 중 아무 피드백 없음
- CounterfactualAddress: "Deriving..." 텍스트만 표시
- SponsorConsole status cards: "Pending" / "Unknown" 텍스트
- TxHistory: 데이터 없을 때 일러스트 + 텍스트만 표시
- 전반적으로 layout shift 발생 가능

**Scope**:
- `<Skeleton />` 컴포넌트 (FE-005에서 생성)를 활용
- BalancePanel: 잔액 카드 2개가 skeleton 애니메이션으로 표시
- CounterfactualAddress: 주소 영역 skeleton
- SponsorConsole: status-grid 4칸 skeleton
- TxHistory: history-item 3개 skeleton
- GNB WalletButton: 연결 중 skeleton pill

**AC**:
- [ ] 모든 데이터 의존 영역에 로딩 시 skeleton 표시
- [ ] skeleton → 실제 데이터 전환 시 layout shift 0
- [ ] skeleton 애니메이션이 일관된 pulse 패턴

---

### FE-007: Responsive Design 재설계

**Goal**: 모바일 퍼스트 반응형 레이아웃으로 전면 재설계

**현재 문제**:
- 현재 breakpoint: 420px, 600px, 900px, 1400px — 기준 불명확
- 모바일에서 sidebar가 main content 위에 스택 → 핵심 flow가 아래로 밀림
- `SectionNav`가 모바일에서 의미 없는 위치에 떠다님
- `status-grid` 4칸이 900px 이하에서 2칸으로만 축소
- `hero-title`의 `max-width: 9ch`가 모바일에서 불필요한 줄바꿈 유발

**Scope**:
- Breakpoint 표준화: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`
- 모바일 (< md):
  - GNB: compact (logo + wallet button만)
  - Bottom navigation bar 도입 (FE-010)
  - 카드 패딩/마진 축소
  - 히어로 섹션 compact 버전
  - stat-grid 1칸, status-grid 1칸
  - balance-grid 스택 (1칸)
- 태블릿 (md ~ lg):
  - 2컬럼 레이아웃 (sidebar + main)
  - stat-grid 2칸
- 데스크톱 (lg+):
  - 현재와 유사하되 max-width 조정
- 모든 터치 타겟 최소 44x44px 보장 (이미 일부 적용)

**AC**:
- [ ] 모바일에서 핵심 액션(Send, Sponsor)까지 2탭 이내 접근
- [ ] 모든 터치 타겟 44x44px 이상
- [ ] 가로 스크롤 발생 0
- [ ] 420px ~ 1400px 전 구간에서 레이아웃 깨짐 없음

---

## P2 — User Flows 개선

### FE-008: Token Payment Flow 재설계

**Goal**: 토큰 모드 플로우를 직관적 step-by-step 위저드로 재설계

**현재 문제**:
- `TokenModeFlow.tsx`: 버튼 하나("Pay gas in tUSDT") → 전체 flow가 블랙박스
- 사용자가 무엇이 일어나는지 사전 이해 불가 (approve → call → settle)
- 토큰 선택 불가 (tUSDT 하드코딩)
- 가스비 예상(quote) 미리보기 없음 → 버튼 누른 후에야 확인
- 결과 패널이 플로우 카드 아래에 append — 스크롤 필요

**Scope**:
- `/send` 페이지에 3-step 위저드 UI:
  1. **Configure**: 대상 토큰 선택 + 실행할 액션 확인 + 예상 가스비(quote preview)
  2. **Review & Sign**: Permit2 서명 내용 요약 + 서명 요청
  3. **Execute & Confirm**: UserOp 제출 + 진행 상태 + 결과
- Quote preview: `/v1/quote/token` 프리페치 → 예상 tUSDT 비용 표시
- 토큰 선택 dropdown (향후 다중 토큰 지원 대비, 현재는 tUSDT만 활성)
- 결과 화면에 "Send Another" + "View in History" CTA
- 진행 중 다른 영역 비활성화 (overlay 또는 dedicated page)

**AC**:
- [ ] 사용자가 서명 전 예상 비용 확인 가능
- [ ] 각 단계의 진행 상태가 시각적으로 명확
- [ ] 결과에서 다음 액션으로 자연스럽게 이어짐
- [ ] 실패 시 어떤 단계에서 실패했는지 명확

---

### FE-009: Sponsor Console을 독립 페이지로 분리

**Goal**: 스폰서 콘솔을 `/sponsor` 전용 페이지로 분리하고 대시보드 경험 제공

**현재 문제**:
- `SponsorConsole.tsx` (330줄)가 FlowTabs의 Sponsor 탭 안에 인라인
- Campaign 생성 폼 + 상태 모니터링 + 실행 플로우가 한 탭에 혼재
- "Advanced Campaign Settings"가 `<details>` 토글 — 중요 설정이 숨겨짐
- status-grid 4칸이 모바일에서 접근 어려움
- 여러 캠페인 관리 불가 (하나만 활성)

**Scope**:
- `/sponsor` 페이지 구성:
  - **Campaign List**: 생성한 캠페인 목록 (카드 그리드)
  - **Campaign Detail**: 선택 캠페인의 상세 대시보드
    - 예산 진행률 (budget bar, 현재 것 개선)
    - 사용자별 사용량 차트
    - 허용 타겟 목록 관리
    - 활성/비활성 토글
  - **Create Campaign**: 모달 또는 별도 섹션
    - 모든 필드를 기본 노출 (더 이상 `<details>` 숨김 아님)
    - 생성 후 즉시 detail로 이동
  - **Sponsor Execute**: 선택된 캠페인으로 UserOp 실행
- Campaign ID를 URL param으로 관리 (`/sponsor?id=0x...`)

**AC**:
- [ ] 캠페인 생성/조회/실행이 직관적 flow로 연결
- [ ] 여러 캠페인 전환 가능
- [ ] 대시보드에서 실시간 예산 소진 확인
- [ ] 폼 필드가 모두 기본 노출 (숨김 없음)

---

### FE-010: Mobile Bottom Navigation

**Goal**: 모바일에서 핵심 네비게이션을 하단 탭바로 제공

**현재 문제**:
- 모바일에서 GNB만으로는 주요 기능 접근이 불편
- 스크롤 기반 네비게이션은 모바일에서 직관적이지 않음
- iOS/Android 네이티브 앱 사용자의 mental model과 불일치

**Scope**:
- `<BottomNav />` 컴포넌트 (md 이하에서만 표시)
- 탭 아이콘 + 라벨: Home, Send, Sponsor, History
- 현재 페이지 active 표시
- safe area 대응 (iOS notch/home indicator)
- 스크롤 시 auto-hide (optional)
- GNB의 중앙 네비 링크는 md 이상에서만 표시

**AC**:
- [ ] 768px 이하에서 하단 고정 네비게이션 표시
- [ ] 탭 전환이 1-tap으로 가능
- [ ] safe area inset 대응 (iPhone)
- [ ] 키보드 열릴 때 하단 탭바 숨김

**Depends on**: FE-003

---

### FE-011: Transaction History 풀 페이지 개선

**Goal**: 트랜잭션 히스토리를 전용 페이지로 분리하고 필터/검색/페이지네이션 추가

**현재 문제**:
- `TxHistory.tsx`: 최근 10개만 표시, 세션 휘발성 (새로고침 시 소실)
- 필터 없음 (Token/Sponsor 구분 불가)
- 검색 없음 (tx hash로 찾기 불가)
- "Keep the latest demo steps visible for judges" — 데모용 언어
- 데이터가 React state에만 존재 → persistent storage 없음

**Scope**:
- `/history` 페이지:
  - 필터: All / Token Mode / Sponsor Mode
  - 검색: tx hash, userOp hash
  - 정렬: 최신순 / 오래된순
  - 페이지네이션 또는 무한 스크롤
- localStorage 또는 IndexedDB로 히스토리 persist
- 각 트랜잭션 상세 expand:
  - Gas cost breakdown
  - Settlement details
  - Timeline (현재 TokenModeFlow의 timeline)
  - Full tx hash + explorer link
- CSV export (optional)
- Empty state 개선: 첫 트랜잭션 유도 CTA

**AC**:
- [ ] 세션 간 히스토리 유지
- [ ] Mode 필터 동작
- [ ] Hash 검색 동작
- [ ] 100+ 트랜잭션에서도 성능 저하 없음

---

### FE-012: Wallet Connection Modal 개선

**Goal**: 프로덕션 수준의 지갑 연결 모달 UX 구현

**현재 문제**:
- `WalletConnect.tsx`: 커넥터가 버튼 리스트로 나열 — 아이콘 없음
- 연결 진행 상태 피드백 없음
- 네트워크 불일치 처리 없음
- WalletConnect QR 코드 표시 없음
- 모바일 deep link (MetaMask Mobile 등) 미지원

**Scope**:
- `<WalletModal />` 구현 (FE-002의 일부):
  - 커넥터별 브랜드 아이콘 (MetaMask fox, WalletConnect logo 등)
  - "Recent" 커넥터 하이라이트 (localStorage에 마지막 사용 커넥터 저장)
  - 연결 진행 중: spinner + "Connecting to MetaMask..." + Cancel
  - 연결 실패: 에러 메시지 + Retry
  - 네트워크 자동 감지 → Polkadot Hub가 아니면 switchChain 프롬프트
  - WalletConnect: QR 코드 직접 표시 (모바일 카메라 스캔)
  - 모바일: 지갑 앱 deep link 지원
- 연결 성공 시 모달 자동 닫힘 + Toast 알림

**AC**:
- [ ] 커넥터별 아이콘 + 이름 표시
- [ ] 연결 진행/실패/성공 상태가 모달 내에서 피드백
- [ ] 잘못된 네트워크 시 체인 전환 유도
- [ ] 모바일에서 지갑 앱으로 이동 가능

---

### FE-013: Token Selector UI

**Goal**: 가스 결제에 사용할 토큰을 선택할 수 있는 UI 제공

**현재 문제**:
- `NEXT_PUBLIC_TOKEN_ADDRESS` 환경변수로 tUSDT가 하드코딩
- `BalancePanel.tsx:112`: `process.env.NEXT_PUBLIC_TOKEN_ADDRESS` 직접 참조
- 향후 다중 토큰 지원 시 UI 변경 범위가 매우 큼
- 사용자가 어떤 토큰으로 결제하는지 사전에 확인/선택 불가

**Scope**:
- `<TokenSelector />` 컴포넌트:
  - 드롭다운: 지원 토큰 목록 (아이콘 + 심볼 + 잔액)
  - 선택된 토큰 하이라이트
  - 잔액 부족 시 경고 표시
  - 검색 기능 (토큰이 많아질 경우)
- 지원 토큰 목록은 paymaster API에서 동적 fetch 또는 config
- `/send` 페이지의 Configure step에 통합 (FE-008)
- BalancePanel에서 선택된 토큰의 잔액 표시

**AC**:
- [ ] 지원 토큰 목록이 UI에서 확인 가능
- [ ] 토큰 선택 시 quote가 자동 갱신
- [ ] 잔액 부족 토큰은 비활성 또는 경고 표시
- [ ] 현재는 tUSDT만 활성, 구조적으로 확장 가능

**Depends on**: FE-008

---

## P3 — Visual Polish & Production Quality

### FE-014: 데모 전용 언어 및 UX 패턴 제거

**Goal**: 모든 데모/해커톤 전용 텍스트와 UI 패턴을 상용 수준으로 교체

**현재 문제 (전체 목록)**:
- `page.tsx:15-27`: `HEALTH_LABEL` — "Connecting..." 은 OK, 나머지도 검토
- `page.tsx:81`: "Connect your EOA to start the demo."
- `page.tsx:96`: "Run Flow A to submit a UserOperation."
- `StepIndicator.tsx:15`: "Guided Demo Flow" 전체 섹션
- `StepIndicator.tsx:16`: "Run the exact judge path: connect, validate, execute, and verify settlement."
- `StepIndicator.tsx:18`: "Quick Demo" 버튼
- `BalancePanel.tsx:198`: "Capture the before/after proof that the EOA stays at zero PAS"
- `BalancePanel.tsx:219`: "This is the magic: no native gas needed."
- `BalancePanel.tsx:225`: "Target state: keep native gas at zero."
- `BalancePanel.tsx:244`: "Watch tUSDT move only on token mode."
- `TokenModeFlow.tsx:41`: "Approve Permit2, call DemoDapp, and settle gas in tUSDT with zero PAS on hand."
- `SponsorModeFlow.tsx:44`: "Use the active campaign budget to sponsor the same DemoDapp action without token spend."
- `SponsorConsole.tsx:174`: "Create a campaign, switch the active sponsor budget, and keep the spend meter live while polling."
- `TxHistory.tsx:24`: "Keep the latest demo steps visible for judges during repeat runs."
- `CounterfactualAddress.tsx:38`: "Counterfactual address derived from the GasStationFactory on sender salt `0`."
- `WalletConnect.tsx:43`: "Connect the EOA that will sign the paymaster quote and UserOperation."
- `FlowTabs.tsx:74-75`: document.title에 이모지 사용 ("✅", "❌", "⏳")

**Scope**:
- 모든 subtitle/description을 사용자 관점 언어로 교체
  - "EOA" → "Your wallet"
  - "Counterfactual address" → "Smart account"
  - "UserOperation" → "Transaction"
  - "DemoDapp" → 실제 dApp 이름 또는 제네릭 표현
  - "Flow A" / "Flow B" → "Pay with Token" / "Sponsored Transaction"
- 기술적 설명은 tooltip 또는 "Learn more" 링크로 이동
- document.title 이모지 제거, 일반 텍스트 사용
- "for judges", "demo", "guided" 등의 표현 전면 제거

**AC**:
- [ ] UI에 "demo", "judge", "Flow A/B", "EOA" 텍스트 0개
- [ ] 기술 용어가 tooltip 또는 help 링크 뒤로 이동
- [ ] 비기술 사용자가 읽어도 이해 가능한 문구

---

### FE-015: Hero Section 재설계 → Dashboard Landing

**Goal**: 과도한 히어로 섹션을 실용적 대시보드 랜딩으로 교체

**현재 문제**:
- 히어로가 화면의 ~60%를 차지 — 핵심 기능까지 스크롤 필요
- stat-grid ("Gas Required: 0 PAS", "Payment Modes: 2", "Settlement: Permit2")는 정적 마케팅 텍스트
- `hero::before`, `hero::after` 장식 요소가 과도
- 연결 전과 연결 후의 히어로 차이가 CTA 버튼 하나뿐

**Scope**:
- `/` 페이지를 대시보드로 전환:
  - **미연결 상태**: compact 히어로 (1줄 tagline + Connect CTA) + 제품 소개 카드 2~3개
  - **연결 상태**: 대시보드 레이아웃
    - 잔액 요약 카드 (EOA + Smart Account)
    - 최근 트랜잭션 3건
    - Quick Actions: "Pay with Token" / "Create Campaign"
    - 네트워크 상태 카드
- 히어로 장식 요소(pseudo-elements, gradient orbs) 축소
- stat-grid 제거 또는 실시간 데이터로 대체

**AC**:
- [ ] 연결 후 핵심 정보가 스크롤 없이 바로 보임
- [ ] 미연결 상태에서도 제품 가치가 전달됨
- [ ] 대시보드에서 주요 액션까지 1-click 접근

---

### FE-016: Animation & Microinteraction 정리

**Goal**: 과도한 애니메이션을 정리하고 의미있는 microinteraction만 남김

**현재 문제**:
- `heroShift`: 9초 무한 루프 — 의미 없는 장식 애니메이션
- `walletPulse`: 지갑 버튼 계속 펄스 → 주의 분산
- `livePulse`: 네트워크 dot 1.4초 펄스 — OK이나 크기 과도
- `stepPulse`: StepIndicator 활성 항목 펄스 → 제거 대상 (StepIndicator 자체 제거)
- `cardEnter`: 모든 카드에 적용 — 첫 로드 시 괜찮으나 페이지 전환마다 반복되면 과도
- `timelinePulse`: timeline 활성 노드 펄스 → OK
- `stat-value--live` transition: scale(1.04) — 미묘하지만 불필요할 수 있음

**Scope**:
- `prefers-reduced-motion` 미디어 쿼리 전면 적용
- 제거 대상: `heroShift`, `walletPulse`, `stepPulse`, `stat-value--live` scale
- 유지 대상: `cardEnter` (첫 mount만), `timelineItemEnter`, `timelinePulse`, `buttonSpin`, `livePulse`
- 개선 대상:
  - 페이지 전환 transition (fade or slide)
  - 버튼 hover/press feedback 정교화
  - 토글/탭 전환 시 content transition
  - 잔액 숫자 roll (현재 `useAnimatedNumber` — 유지하되 duration 조정)
- 모든 `animation-duration`을 CSS 변수화

**AC**:
- [ ] `prefers-reduced-motion` 시 모든 non-essential 애니메이션 비활성
- [ ] 의미 없는 장식 애니메이션 0개
- [ ] 사용자 액션에 대한 피드백 애니메이션은 모두 유지

---

### FE-017: Empty States 재설계

**Goal**: 빈 상태(no data, not connected, error)를 각 맥락에 맞게 재설계

**현재 문제**:
- `TxHistory.tsx:26-31`: SVG 아이콘 + "No transactions yet" — 제네릭
- `BalancePanel.tsx:224`: "Connect wallet" 텍스트만
- `CounterfactualAddress.tsx:49`: "Connect wallet to derive" 텍스트
- `SponsorConsole.tsx:165`: "No active campaign yet." 한 줄
- 전반적으로 empty state가 단순 텍스트로만 처리되어 다음 액션 유도가 약함

**Scope**:
- 각 empty state별 디자인:
  - **미연결**: 일러스트 + "Connect your wallet to get started" + Connect CTA
  - **히스토리 없음**: 일러스트 + "No transactions yet" + "Send your first gasless transaction" CTA
  - **캠페인 없음**: 일러스트 + "No campaigns" + "Create your first campaign" CTA
  - **잔액 로딩 실패**: retry 버튼 + 에러 설명
  - **네트워크 오류**: 전용 에러 화면 + 재연결 유도
- 일러스트는 DotFuel 브랜드 컬러 사용 (간단한 SVG)
- 모든 empty state에 primary CTA 1개 포함

**AC**:
- [ ] 모든 empty state에 다음 액션 CTA 포함
- [ ] 일러스트가 브랜드와 일관됨
- [ ] 에러 상태와 빈 상태가 시각적으로 구분됨

---

### FE-018: Error Boundary & Fallback Pages

**Goal**: React Error Boundary와 HTTP 에러 페이지를 추가하여 크래시 복원력 확보

**현재 문제**:
- Error Boundary 없음 → 컴포넌트 에러 시 전체 앱 white screen
- 404 페이지 없음 (멀티 페이지 전환 후 필요)
- `ErrorNotice.tsx`는 비즈니스 에러만 처리 → uncaught exception 대응 불가
- 네트워크 offline 상태 감지/UI 없음

**Scope**:
- `components/ErrorBoundary.tsx`:
  - React Error Boundary wrapper
  - Fallback UI: "Something went wrong" + Retry + Report 링크
  - 에러 로깅 (console + optional Sentry)
- `app/not-found.tsx`: 404 페이지
- `app/error.tsx`: 런타임 에러 페이지
- Offline detection: `navigator.onLine` + 배너 표시
- 각 주요 섹션(BalancePanel, FlowTabs, SponsorConsole)에 개별 Error Boundary 적용

**AC**:
- [ ] 컴포넌트 에러 시 전체 앱 크래시 대신 해당 섹션만 fallback 표시
- [ ] 404 페이지 존재
- [ ] 오프라인 시 사용자에게 알림
- [ ] Retry 버튼으로 에러 복구 가능

---

### FE-019: Footer 추가

**Goal**: 상용 프로덕트에 필수적인 Footer 영역 추가

**현재 문제**:
- Footer 없음 — 페이지가 그냥 끝남
- 법적 고지, 지원 링크, 소셜 링크 등 배치할 곳 없음
- 브랜드 일관성의 마지막 터치포인트 부재

**Scope**:
- `<Footer />` 컴포넌트:
  - 좌측: DotFuel 로고 + 한 줄 설명
  - 중앙: 링크 그룹 (Product, Resources, Legal)
    - Product: Dashboard, Send, Sponsor
    - Resources: Docs, GitHub, Block Explorer
    - Legal: Terms of Service, Privacy Policy
  - 우측: 소셜 아이콘 (Twitter/X, Discord, GitHub)
  - 하단: Copyright + "Built on Polkadot"
- 모바일: 스택 레이아웃으로 전환
- 다크모드 대응

**AC**:
- [ ] 모든 페이지 하단에 Footer 표시
- [ ] 링크가 정상 동작 (placeholder URL이라도)
- [ ] 모바일에서 레이아웃 깨짐 없음

---

### FE-020: Dark Mode 정밀 QA 및 보완

**Goal**: 다크모드 디자인 완성도를 라이트 모드 수준으로 끌어올림

**현재 문제**:
- `globals.css:1128-1256`: 다크모드 override 존재하나 불완전
- `<style jsx>` 내 컴포넌트별 스타일에는 다크모드 override 없음:
  - `SectionNav.tsx:74-76`: 배경색 하드코딩 (`rgba(255, 250, 242, 0.9)`)
  - `InlineProgressStepper.tsx:100`: 배경색 하드코딩
  - `Toast.tsx:79-88`: success/error 배경 하드코딩
  - `CopyableHex.tsx:107`: 배경색 하드코딩
- 일부 컴포넌트에서 color 변수 대신 직접 색상 사용

**Scope**:
- 모든 `<style jsx>` 블록에 `@media (prefers-color-scheme: dark)` 추가
- 또는 `<style jsx>` 제거 → globals.css로 통합 (FE-004와 연계)
- 다크모드 전용 테스트 체크리스트:
  - 모든 텍스트 contrast ratio WCAG AA 이상
  - 배경-카드-오버레이 레이어 구분 명확
  - 포커스 링 가시성
  - 차트/진행률 바 가독성
- (Optional) 수동 다크/라이트 토글 (system 외 user preference)

**AC**:
- [ ] 다크모드에서 모든 컴포넌트 정상 렌더링
- [ ] 하드코딩 색상 0개 (모두 CSS 변수)
- [ ] WCAG AA contrast 충족

---

### FE-021: Notification Center (Toast Queue 개선)

**Goal**: 단일 Toast를 notification center로 확장

**현재 문제**:
- `Toast.tsx`: 한 번에 1개만 표시 → 연속 TX 시 이전 알림 유실
- 닫힌 알림 다시 볼 수 없음
- 성공/에러만 구분 — warning, info 타입 없음
- `FlowTabs.tsx:66-71`: toast 상태가 FlowTabs 로컬 state로 관리

**Scope**:
- Toast queue: 최대 3개까지 스택 표시 (top-right)
- 각 toast에 progress bar (auto-dismiss countdown 시각화)
- Notification center dropdown (GNB에 bell 아이콘):
  - 미읽은 알림 카운트 badge
  - 최근 20개 알림 히스토리
  - "Mark all as read" / "Clear all"
- Toast 타입 확장: success, error, warning, info
- Toast 상태를 글로벌 store로 이전

**AC**:
- [ ] 동시 3개까지 toast 스택 표시
- [ ] 닫힌 알림을 notification center에서 재확인 가능
- [ ] 미읽은 알림 카운트가 GNB에 표시

**Depends on**: FE-001

---

### FE-022: Accessibility (a11y) 전면 감사

**Goal**: WCAG 2.1 AA 기준 충족

**현재 문제**:
- `role="status"`, `aria-live="polite"` 일부 적용 (Toast) — 다른 동적 영역에는 미적용
- `aria-hidden` 사용은 있으나 체계적이지 않음
- keyboard navigation: focus-visible 스타일 있으나 tab order 검증 필요
- color contrast: `--muted: #6f6256` on `--bg: #f6efe3` — 검증 필요
- `<button>` 내 아이콘만 있는 경우 `aria-label` 부재 (copy 버튼 등)
- skip-to-content 링크 없음

**Scope**:
- axe-core 또는 Lighthouse 접근성 감사 실행
- skip-to-content 링크 추가
- 모든 interactive 요소에 적절한 aria-label
- 동적 컨텐츠에 aria-live 적용 (BalancePanel 숫자 변경, progress stepper)
- tab order 검증 + tabindex 조정
- color contrast 전면 검증 + 미달 시 토큰 조정
- 스크린 리더 테스트 (VoiceOver on macOS)

**AC**:
- [ ] Lighthouse Accessibility 90+ 점수
- [ ] 키보드만으로 전체 flow 완주 가능
- [ ] 스크린 리더에서 주요 flow 이해 가능
- [ ] color contrast WCAG AA 전면 충족

---

## 우선순위 요약

| Priority | Ticket | Title | Depends On |
|----------|--------|-------|------------|
| **P0** | FE-001 | Global Navigation Bar (GNB) | FE-002 |
| **P0** | FE-002 | Global Wallet State & Wallet Button | - |
| **P0** | FE-003 | Multi-Page Routing | FE-001, FE-002 |
| **P1** | FE-004 | Design Token 체계화 | - |
| **P1** | FE-005 | 공통 UI 컴포넌트 추출 | FE-004 |
| **P1** | FE-006 | Skeleton Loading States | FE-005 |
| **P1** | FE-007 | Responsive Design 재설계 | FE-001, FE-010 |
| **P2** | FE-008 | Token Payment Flow 재설계 | FE-003 |
| **P2** | FE-009 | Sponsor Console 독립 페이지 | FE-003 |
| **P2** | FE-010 | Mobile Bottom Navigation | FE-003 |
| **P2** | FE-011 | Transaction History 풀 페이지 | FE-003 |
| **P2** | FE-012 | Wallet Connection Modal | FE-002 |
| **P2** | FE-013 | Token Selector UI | FE-008 |
| **P3** | FE-014 | 데모 전용 언어 제거 | - |
| **P3** | FE-015 | Hero → Dashboard 재설계 | FE-003 |
| **P3** | FE-016 | Animation 정리 | - |
| **P3** | FE-017 | Empty States 재설계 | FE-005 |
| **P3** | FE-018 | Error Boundary & Fallback | FE-003 |
| **P3** | FE-019 | Footer 추가 | - |
| **P3** | FE-020 | Dark Mode QA | FE-004 |
| **P3** | FE-021 | Notification Center | FE-001 |
| **P3** | FE-022 | Accessibility 감사 | FE-005 |

---

## 실행 순서 제안

```
Phase 1 (Foundation):  FE-002 → FE-004 → FE-005 → FE-014
Phase 2 (Navigation):  FE-001 → FE-003 → FE-010
Phase 3 (Flows):       FE-008 → FE-009 → FE-011 → FE-012 → FE-013
Phase 4 (Polish):      FE-006 → FE-007 → FE-015 → FE-016 → FE-017
Phase 5 (Production):  FE-018 → FE-019 → FE-020 → FE-021 → FE-022
```
