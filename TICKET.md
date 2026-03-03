# TICKET.md — DotFuel Work Tickets

## 사용 방법

- 티켓은 마일스톤 순서(M0 → M1 → M1.5 → M2 → M3 → M3.5 → M4 → M4.5 → M5 → M6)로 처리한다.
- 각 티켓은 **Depends on** 에 명시된 선행 티켓이 완료된 이후에 시작한다.
- AC(Acceptance Criteria) 항목이 모두 `[통과]`가 될 때까지 다음 티켓으로 넘어가지 않는다.
- 커밋 메시지는 아래 제안을 그대로 사용한다.
- `git push`, `git pull`, `git rebase --interactive`, `git reset --hard`, `--force` 는 절대 실행하지 않는다.

## 마일스톤 요약

| 마일스톤 | 내용 | 티켓 |
|---|---|---|
| M0 | 레포 스캘폴드 + Foundry 셋업 + 인터페이스 + Permit2 벤더 | T-001 ~ T-004 |
| M1 | GasStationAccount + Factory | T-005 ~ T-007 |
| M1.5 | TokenRegistry + CampaignRegistry + DemoDapp | T-008 ~ T-010 |
| M2 | GasStationPaymaster (두 모드, 전체 테스트) | T-011 ~ T-015 |
| M3 | Paymaster API (quote 엔드포인트 + EIP-712 서명) | T-016 ~ T-020 |
| M3.5 | Bundler docker-compose + Assets bootstrap 스크립트 | T-021 ~ T-023 |
| M4 | demo-web (전체 UserOp 플로우, 두 모드) | T-024 ~ T-026 |
| M4.5 | TestNet 배포 + 데모 트랜잭션 6개 기록 | T-027 ~ T-028 |
| M5 | Sponsor console | T-029 |
| M6 | README 마무리 + 제출 체크리스트 | T-030 |

---

## M0 — 레포 스캘폴드

### T-024: demo-web 스캘폴드 (Next.js + viem + wagmi)

**Milestone:** M4
**Effort:** M
**Depends on:** T-016

**Goal:**
demo-web Next.js 앱의 기본 구조를 설정한다. viem/wagmi 설정, Polkadot Hub TestNet 체인 정의, 지갑 연결 UI를 포함한다.

**Files to create:**
```
apps/demo-web/package.json
apps/demo-web/tsconfig.json
apps/demo-web/next.config.js
apps/demo-web/src/
  app/
    layout.tsx
    page.tsx
  lib/
    chains.ts              # Polkadot Hub TestNet 체인 정의
    wagmi.ts               # wagmi config
    paymaster-client.ts    # paymaster API fetch helpers
  components/
    WalletConnect.tsx
    CounterfactualAddress.tsx
```

**Scope:**
`chains.ts`:
```typescript
export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://eth-rpc-testnet.polkadot.io/"] }
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout-testnet.polkadot.io/" }
  },
});
```

`wagmi.ts`: WalletConnect + MetaMask 커넥터 설정

Landing page: "DotFuel — Pay gas with any token" + Connect Wallet 버튼

**AC:**
- [ ] `pnpm --filter demo-web dev` 실행 → localhost:3000 접근 가능.
- [ ] MetaMask 연결 → EOA 주소 표시.
- [ ] 연결된 주소 기반으로 counterfactual smart account 주소 표시 (`GasStationFactory.getAddress`).
- [ ] 체인 ID가 420420417로 표시된다.

**Test command:**
```bash
pnpm --filter demo-web build 2>&1 | tail -10
```

**Commit message:**
```
feat(web): scaffold demo-web with Next.js, viem, wagmi, and Polkadot Hub chain config
```

---

### T-025: demo-web — Flow A (Token Mode, 0 PAS)

**Milestone:** M4
**Effort:** L
**Depends on:** T-024, T-018

**Goal:**
"Pay gas in tUSDT" 버튼을 클릭하면 전체 토큰 모드 UserOp 플로우를 실행하는 UI를 구현한다. Permit2 서명 → UserOp 빌드 → bundler 전송 → 결과 표시.

**Files to create:**
```
apps/demo-web/src/
  components/
    TokenModeFlow.tsx
  hooks/
    useTokenModeUserOp.ts
  lib/
    userOpBuilder.ts       # UserOp 조립 + bundler 전송
    bundlerClient.ts       # eth_sendUserOperation wrapper
```

**Scope:**
UI 단계 (PROJECT.md §10 Flow A):
1. "Pay gas in tUSDT" 버튼 클릭
2. `POST /v1/quote/token` 호출 → Permit2 typed data 수신
3. `walletClient.signTypedData(permit2TypedData)` → permit2Signature
4. `paymasterAndData` 조립 (permit2Signature 삽입)
5. `eth_estimateUserOperationGas` 호출
6. UserOp 서명 (`walletClient.signMessage(userOpHash)`)
7. `eth_sendUserOperation` 전송
8. tx hash → Blockscout 링크 표시
9. 결과: "Gas cost: 0 PAS | Paid: X tUSDT | Tx: [link]"

`userOpBuilder.ts`:
- `buildTokenModeUserOp(params)` — initCode 포함 여부 자동 판단
- executeBatch callData 인코딩: `[approve(permit2, max), demoDapp.execute("Hello DotFuel!")]`

**AC:**
- [ ] MetaMask 연결 + tUSDT 잔고 있는 계정으로 Flow A 실행 → tx hash 수신.
- [ ] initCode 포함 UserOp (첫 배포)과 미포함 UserOp 모두 작동.
- [ ] Blockscout 링크가 클릭 가능하고 mined tx를 가리킨다.
- [ ] PAS 잔고 0인 계정으로 실행 가능.

**Test command:**
```bash
pnpm --filter demo-web build 2>&1 | tail -10
```

**Commit message:**
```
feat(web): implement Flow A token mode UserOp (Permit2 sign → bundler submit → Blockscout link)
```

---

### T-026: demo-web — Flow B (Sponsor Mode) + UI polish

**Milestone:** M4
**Effort:** M
**Depends on:** T-025, T-019

**Goal:**
스폰서 모드 UserOp 플로우와 UI 개선을 구현한다. Flow A/B 탭 전환, 트랜잭션 히스토리, 로딩 상태 표시를 포함한다.

**Files to create:**
```
apps/demo-web/src/
  components/
    SponsorModeFlow.tsx
    TxHistory.tsx
    LoadingOverlay.tsx
  hooks/
    useSponsorModeUserOp.ts
```

**Scope:**
Flow B 단계 (PROJECT.md §10 Flow B):
1. "Execute Sponsored" 버튼 클릭
2. `POST /v1/quote/sponsor` 호출
3. `paymasterAndData` 조립
4. UserOp 빌드 + 서명
5. `eth_sendUserOperation`
6. 결과: "Gas: Sponsored by [campaign name] | Tx: [link]"

UI 개선:
- 탭: "Token Mode" / "Sponsor Mode"
- 상단: 연결 계정 + counterfactual 주소 + tUSDT 잔고
- 하단: 트랜잭션 히스토리 (최근 5건)
- 에러 상태 명확히 표시

**AC:**
- [ ] Flow B 실행 → tx hash + "Sponsored" 라벨 표시.
- [ ] 탭 전환 가능.
- [ ] 에러(bundler 거부, 잔고 부족 등)가 UI에 표시된다.
- [ ] `pnpm --filter demo-web build` 에러 없음.

**Test command:**
```bash
pnpm --filter demo-web build 2>&1 | tail -10
```

**Commit message:**
```
feat(web): implement Flow B sponsor mode and UI polish (tabs, tx history, loading states)
```

---

## M4.5 — TestNet 배포

### T-027: Polkadot Hub TestNet 전체 배포

**Milestone:** M4.5
**Effort:** M
**Depends on:** T-015, T-022

**Goal:**
전체 컨트랙트를 Hub TestNet에 배포하고, tUSDT 토큰을 bootstrap하며, docker-compose를 실제 배포된 주소로 설정하여 end-to-end 실행을 확인한다.

**Files to create/modify:**
```
deployments/testnet.json           # 배포 주소 기록
docker/.env                        # 실제 주소로 업데이트 (git ignore)
docker/.env.example                # 템플릿 업데이트
```

**Scope:**
배포 순서:
1. `cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL_TESTNET --broadcast --verify`
2. `deployments/testnet.json` 업데이트
3. `pnpm bootstrap-assets` 실행 → assetId + precompile address 기록
4. `TokenRegistry.setToken(tUSDT, { enabled: true, decimals: 6, markupBps: 300, ... })`
5. `CampaignRegistry.createCampaign(...)` + `fundCampaign()`
6. `docker-compose up` — 배포된 주소 사용
7. `/healthz` 확인

**AC:**
- [ ] `deployments/testnet.json` 에 모든 컨트랙트 주소가 기록된다.
- [ ] Blockscout에서 각 컨트랙트가 조회 가능하다.
- [ ] tUSDT precompile 주소가 TokenRegistry에 등록된다.
- [ ] bundler가 TestNet RPC에 연결되고 EntryPoint를 인식한다.
- [ ] `forge verify-contract` 또는 Blockscout ABI 업로드 완료.

**Test command:**
```bash
curl https://blockscout-testnet.polkadot.io/api?module=contract&action=getabi&address=$(cat deployments/testnet.json | jq -r .paymaster) 2>&1 | jq .status
```

**Commit message:**
```
chore(deploy): deploy all contracts to Polkadot Hub TestNet and record addresses
```

---

### T-028: 데모 트랜잭션 6개 기록 + README 주소 업데이트

**Milestone:** M4.5
**Effort:** M
**Depends on:** T-027

**Goal:**
토큰 모드 3개, 스폰서 모드 3개 UserOp를 TestNet에서 실행하고 Blockscout 링크를 README에 기록한다.

**Files to modify:**
```
README.md                            # Contract Addresses 테이블 업데이트
deployments/testnet.json             # demo tx hashes 추가
```

**Scope:**
실행:
1. Flow A (Token Mode) × 3: 0 PAS 지갑으로 tUSDT 가스 결제
2. Flow B (Sponsor Mode) × 3: 스폰서 캠페인으로 가스 무료 실행
3. 각 tx hash → Blockscout URL 기록

README 업데이트:
- "Contract Addresses (Polkadot Hub TestNet)" 테이블 실제 주소로 채우기
- "Demo Transactions" 섹션 추가:
  ```markdown
  ## Demo Transactions (Polkadot Hub TestNet)
  | # | Mode | Tx Hash | Explorer |
  |---|---|---|---|
  | 1 | Token Mode | 0x... | [Blockscout](https://...) |
  ...
  ```

**AC:**
- [ ] README의 Contract Addresses 테이블에 _TBD_ 가 없음.
- [ ] Demo Transactions 섹션에 6개 tx 링크가 있음.
- [ ] 각 Blockscout 링크가 실제로 접근 가능하고 mined tx임.
- [ ] 3개 토큰 모드 tx에서 `TokenGasPaid` 이벤트가 확인됨.
- [ ] 3개 스폰서 모드 tx에서 `Sponsored` 이벤트가 확인됨.

**Test command:**
```bash
grep -c "blockscout" README.md
# 6 이상이어야 함
```

**Commit message:**
```
docs: record 6 demo transactions and update README with deployed contract addresses
```

---

## M5 — Sponsor Console

### T-029: sponsor-console UI

**Milestone:** M5
**Effort:** M
**Depends on:** T-026, T-020

**Goal:**
스폰서가 캠페인을 생성/펀딩하고 사용 현황을 실시간으로 확인할 수 있는 Sponsor Console 페이지를 demo-web에 추가한다.

**Files to create:**
```
apps/demo-web/src/
  app/
    sponsor/
      page.tsx
  components/
    SponsorConsole.tsx
    CampaignCreator.tsx
    CampaignStats.tsx
```

**Scope:**
페이지 구성:
1. "Create Campaign" 폼:
   - 예산 입력 (PAS)
   - 시작/종료 시간
   - 허용 대상 (DemoDapp 주소 하드코딩)
   - perUserMaxOps
2. "Fund Campaign" 버튼 + 금액 입력
3. Campaign Status 카드:
   - enabled / budget / spent / remaining
   - 사용자별 UserOp 사용량
   - 실시간 폴링 (5초 간격)

**AC:**
- [ ] Campaign 생성 → tx hash 표시.
- [ ] Campaign 펀딩 → 잔고 업데이트.
- [ ] Status 카드가 5초마다 갱신된다.
- [ ] Flow B 실행 시 spent 값이 증가함을 UI에서 확인 가능.

**Test command:**
```bash
pnpm --filter demo-web build 2>&1 | tail -10
```

**Commit message:**
```
feat(web): add sponsor console with campaign creation, funding, and real-time stats
```

---

## M6 — 최종 마무리

### T-030: README 최종 polish + 제출 체크리스트

**Milestone:** M6
**Effort:** S
**Depends on:** T-028, T-029

**Goal:**
README를 judge가 바로 읽을 수 있도록 완성하고, HACKATHON.md의 제출 요건을 모두 체크한다. 데모 영상 링크, Quick Start 검증, 제출 폼 작성.

**Files to modify:**
```
README.md
HACKATHON.md          # 제출 체크리스트 업데이트
```

**Scope:**
README 최종 점검:
- [ ] Quick Start 5단계가 실제 실행 가능한지 검증
- [ ] Contract Addresses 테이블 완성
- [ ] Demo Transactions 6개 링크 확인
- [ ] 데모 영상 링크 추가 (YouTube/Loom)
- [ ] Tech Stack 테이블 정확성 확인
- [ ] Security Design 섹션 — Permit2 witness binding 설명 정확성

HACKATHON.md 제출 체크리스트:
- [ ] GitHub 레포 public 설정 확인
- [ ] Demo video (2-3분) 녹화 완료
- [ ] Submission form 제출
- [ ] Blockscout에서 6개 tx 확인 링크 준비

**AC:**
- [ ] `forge test -vvv` 전체 통과.
- [ ] `docker-compose up` 정상 실행.
- [ ] `pnpm --filter demo-web build` 에러 없음.
- [ ] README Quick Start 5단계를 클린 환경에서 처음부터 실행하면 성공.
- [ ] 데모 영상 링크가 README에 포함된다.

**Test command:**
```bash
cd contracts && forge test -vvv 2>&1 | tail -5
pnpm --filter demo-web build 2>&1 | tail -5
docker-compose -f docker/docker-compose.yml config 2>&1 | grep "services:" | wc -l
```

**Commit message:**
```
docs: finalize README with demo video, quick start validation, and submission checklist
```

---

## 전체 티켓 요약

| ID | Milestone | 제목 | Effort | 선행 |
|---|---|---|---|---|
| T-001 | M0 | pnpm 모노레포 루트 설정 | S | — |
| T-002 | M0 | Foundry 프로젝트 초기화 | S | T-001 |
| T-003 | M0 | Solidity 인터페이스 + UserOperation 구조체 | M | T-002 |
| T-004 | M0 | Permit2 소스 벤더링 | S | T-003 |
| T-005 | M1 | GasStationAccount.sol 구현 | M | T-003 |
| T-006 | M1 | GasStationFactory.sol 구현 | S | T-005 |
| T-007 | M1 | Account + Factory 유닛 테스트 | M | T-005, T-006 |
| T-008 | M1.5 | TokenRegistry.sol 구현 + 테스트 | S | T-002 |
| T-009 | M1.5 | CampaignRegistry.sol 구현 + 테스트 | M | T-002 |
| T-010 | M1.5 | DemoDapp.sol 구현 | S | T-002 |
| T-011 | M2 | Paymaster 골격 + EIP-712 상수 | M | T-003, T-004, T-008, T-009 |
| T-012 | M2 | Paymaster MODE_TOKEN_PERMIT2 validate + postOp | L | T-011 |
| T-013 | M2 | Paymaster MODE_SPONSOR validate + postOp | M | T-012 |
| T-014 | M2 | Paymaster 전체 테스트 | L | T-012, T-013 |
| T-015 | M2 | Deploy.s.sol | M | T-014 |
| T-016 | M3 | packages/shared ABI + 타입 + Permit2 헬퍼 | M | T-014 |
| T-017 | M3 | paymaster-api 스캘폴드 + /healthz | S | T-016 |
| T-018 | M3 | POST /v1/quote/token | L | T-017 |
| T-019 | M3 | POST /v1/quote/sponsor | M | T-017 |
| T-020 | M3 | 캠페인 어드민 엔드포인트 | M | T-017 |
| T-021 | M3.5 | docker-compose (bundler + api) | M | T-017 |
| T-022 | M3.5 | bootstrap-assets.ts | M | T-001 |
| T-023 | M3.5 | compute-precompile-address.ts | S | T-022 |
| T-024 | M4 | demo-web 스캘폴드 | M | T-016 |
| T-025 | M4 | Flow A (Token Mode) | L | T-024, T-018 |
| T-026 | M4 | Flow B (Sponsor Mode) + UI polish | M | T-025, T-019 |
| T-027 | M4.5 | TestNet 전체 배포 | M | T-015, T-022 |
| T-028 | M4.5 | 데모 tx 6개 + README 주소 업데이트 | M | T-027 |
| T-029 | M5 | Sponsor Console UI | M | T-026, T-020 |
| T-030 | M6 | README polish + 제출 체크리스트 | S | T-028, T-029 |

**크리티컬 패스:** T-001 → T-002 → T-003 → T-004 → T-008/T-009 → T-011 → T-012 → T-013 → T-014 → T-015 → T-027 → T-028
