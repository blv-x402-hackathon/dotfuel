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

### T-003: Solidity 인터페이스 + UserOperation 구조체 정의

**Milestone:** M0
**Effort:** M
**Depends on:** T-002

**Goal:**
컨트랙트 전체에서 공유되는 인터페이스와 구조체를 `contracts/src/interfaces/` 에 정의한다. ERC-4337 표준의 `UserOperation`, EntryPoint 콜백 인터페이스, IPermit2, IAccount를 포함한다.

**Files to create:**
```
contracts/src/interfaces/UserOperation.sol    # UserOperation struct + helpers
contracts/src/interfaces/IEntryPoint.sol      # EntryPoint minimal interface
contracts/src/interfaces/IAccount.sol         # IAccount (validateUserOp)
contracts/src/interfaces/IPaymaster.sol       # IPaymaster (validatePaymasterUserOp, postOp)
contracts/src/interfaces/IPermit2.sol         # Permit2 minimum interface
```

**Scope:**

`UserOperation.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes   initCode;
    bytes   callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes   paymasterAndData;
    bytes   signature;
}
```

`IEntryPoint.sol` (최소 인터페이스):
- `handleOps(UserOperation[] calldata ops, address payable beneficiary) external`
- `depositTo(address account) external payable`
- `getDepositInfo(address account) external view returns (DepositInfo memory)`
- `getNonce(address sender, uint192 key) external view returns (uint256 nonce)`
- `getUserOpHash(UserOperation calldata userOp) external view returns (bytes32)`

`IAccount.sol`:
- `validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) external returns (uint256 validationData)`

`IPaymaster.sol`:
- `validatePaymasterUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost) external returns (bytes memory context, uint256 validationData)`
- `postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) external`
- `enum PostOpMode { opSucceeded, opReverted, postOpReverted }`

`IPermit2.sol`:
- `DOMAIN_SEPARATOR() external view returns (bytes32)`
- `permitWitnessTransferFrom(PermitTransferFrom memory permit, SignatureTransferDetails calldata transferDetails, address owner, bytes32 witness, string calldata witnessTypeString, bytes calldata signature) external`
- `PermitTransferFrom`, `TokenPermissions`, `SignatureTransferDetails` 구조체 포함

**AC:**
- [ ] `forge build` 가 에러 없이 실행된다.
- [ ] `IPermit2.sol` 에 `permitWitnessTransferFrom` 함수 시그니처가 정확히 정의된다.
- [ ] `UserOperation.sol` 의 필드 순서와 타입이 ERC-4337 스펙과 일치한다.
- [ ] 모든 파일 상단에 `// SPDX-License-Identifier: MIT` 와 `pragma solidity ^0.8.17;` 가 있다.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "error|Error|warning" | head -20
```

**Commit message:**
```
feat(contracts): add UserOperation struct and core interfaces (IEntryPoint, IPermit2, IAccount, IPaymaster)
```

---

### T-004: Permit2 소스 벤더링

**Milestone:** M0
**Effort:** S
**Depends on:** T-003

**Goal:**
Uniswap Permit2 소스 파일을 `contracts/vendor/permit2/` 에 벤더링한다. Hub에 배포된 Permit2의 소스와 일치해야 하며, 특히 `EIP712.sol`, `SignatureTransfer.sol`, `PermitHash.sol` 이 포함되어야 한다.

**Files to create:**
```
contracts/vendor/permit2/src/
  EIP712.sol
  SignatureTransfer.sol
  libraries/
    PermitHash.sol
    SignatureVerification.sol
```

**Scope:**
- GitHub `Uniswap/permit2` main 브랜치에서 필요한 소스 파일을 직접 복사 (서브모듈 X)
  - 복사 대상: `src/EIP712.sol`, `src/SignatureTransfer.sol`, `src/libraries/PermitHash.sol`, `src/libraries/SignatureVerification.sol`, `src/interfaces/ISignatureTransfer.sol`
- `remappings.txt` 에 `@permit2/=vendor/permit2/` 확인 (T-002에서 이미 설정됨)
- 벤더링 이유 주석: `// Vendored from Uniswap/permit2 main. Hub address is NOT canonical.`

**AC:**
- [ ] `contracts/vendor/permit2/src/SignatureTransfer.sol` 이 존재한다.
- [ ] `contracts/vendor/permit2/src/libraries/PermitHash.sol` 이 존재한다.
- [ ] `forge build` 가 에러 없이 실행된다.
- [ ] Permit2 소스 파일 상단에 벤더링 출처 주석이 있다.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -c "Compiling"
```

**Commit message:**
```
chore(contracts): vendor Uniswap Permit2 source (SignatureTransfer + PermitHash)
```

---

## M1 — GasStationAccount + Factory

### T-005: GasStationAccount.sol 구현

**Milestone:** M1
**Effort:** M
**Depends on:** T-003

**Goal:**
최소화된 ERC-4337 스마트 계정을 구현한다. EOA owner 서명 검증(EIP-1271), executeBatch, EntryPoint 앞으로만 노출된 검증 진입점을 포함한다.

**Files to create:**
```
contracts/src/GasStationAccount.sol
```

**Scope:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

struct Call {
    address to;
    uint256 value;
    bytes   data;
}

contract GasStationAccount {
    address         public owner;
    IEntryPoint     public immutable entryPoint;
    uint256 private _nonce;

    // EIP-1271 magic value
    bytes4 constant EIP1271_SUCCESS = 0x1626ba7e;

    modifier onlyEntryPoint() {
        require(msg.sender == address(entryPoint), "not entrypoint");
        _;
    }

    constructor(IEntryPoint _entryPoint, address _owner) { ... }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external onlyEntryPoint returns (uint256 validationData);

    function execute(address to, uint256 value, bytes calldata data)
        external onlyEntryPoint;

    function executeBatch(Call[] calldata calls)
        external onlyEntryPoint;

    function isValidSignature(bytes32 hash, bytes calldata signature)
        external view returns (bytes4);

    receive() external payable {}
}
```

구현 상세:
- `validateUserOp`: ECDSA recover → owner와 비교; 미스매치 시 `validationData = 1`; `missingAccountFunds` 만큼 EntryPoint에 `call{value}("")`
- `executeBatch`: Call 배열을 순서대로 실행; 하나라도 revert하면 전체 revert
- `isValidSignature`: ECDSA verify → owner 일치시 `EIP1271_SUCCESS`, 아니면 `0xffffffff`
- `_validateSignature` internal 헬퍼 분리 (validateUserOp + isValidSignature 공유)
- `validationData` 인코딩: 실패=1, 성공=0 (validUntil/validAfter 없음, 계정 레벨에서는 불필요)

**AC:**
- [ ] `forge build` 에러 없음.
- [ ] owner 서명 검증 통과 → `validationData == 0`.
- [ ] 잘못된 서명 → `validationData == 1` (revert 아님).
- [ ] `executeBatch` 가 Call 배열 전체를 순서대로 실행한다.
- [ ] EntryPoint 이외 주소가 `validateUserOp` 호출 시 revert.
- [ ] `isValidSignature` 가 owner 서명에 대해 `0x1626ba7e` 반환.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): implement GasStationAccount with EIP-1271 and executeBatch
```

---

### T-006: GasStationFactory.sol 구현

**Milestone:** M1
**Effort:** S
**Depends on:** T-005

**Goal:**
CREATE2 기반 카운터팩추얼 스마트 계정 배포 팩토리를 구현한다. 같은 (owner, salt) 쌍에 대해 항상 동일한 주소를 반환하고, 이미 배포된 경우 기존 계정을 반환한다.

**Files to create:**
```
contracts/src/GasStationFactory.sol
```

**Scope:**
```solidity
contract GasStationFactory {
    IEntryPoint public immutable entryPoint;

    // salt = keccak256(abi.encode(owner, userSalt))
    function getAddress(address owner, uint256 userSalt) public view returns (address);
    function createAccount(address owner, uint256 userSalt) public returns (GasStationAccount);
}
```

구현 상세:
- `getAddress`: `Create2.computeAddress(salt, keccak256(type(GasStationAccount).creationCode ++ abi.encode(args)))`
- `createAccount`: 이미 계정이 배포된 경우 기존 주소 반환 (idempotent); `code.length > 0` 체크
- OpenZeppelin `Create2` 라이브러리 사용 또는 인라인 assembly (단순한 경우)

**AC:**
- [ ] `getAddress(owner, salt)` 와 실제 `createAccount` 배포 주소가 동일.
- [ ] 동일 (owner, salt)로 두 번 `createAccount` 호출해도 같은 주소 반환, revert 없음.
- [ ] 반환된 계정의 `owner` 가 올바른 EOA 주소.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): implement GasStationFactory with CREATE2 counterfactual deployment
```

---

### T-007: GasStationAccount + Factory 유닛 테스트

**Milestone:** M1
**Effort:** M
**Depends on:** T-005, T-006

**Goal:**
계정 서명 검증, executeBatch, 카운터팩추얼 주소 일관성, EIP-1271을 포함한 GasStationAccount + Factory 전체 유닛 테스트를 작성한다.

**Files to create:**
```
contracts/test/GasStationAccount.t.sol
```

**Scope:**
테스트 케이스:
1. `test_validateUserOp_validSig` — 올바른 EOA 서명 → `validationData == 0`
2. `test_validateUserOp_invalidSig` — 잘못된 서명 → `validationData == 1`
3. `test_validateUserOp_onlyEntryPoint` — 외부 호출자 → revert
4. `test_executeBatch_success` — 3개 Call 순서대로 실행
5. `test_executeBatch_revertsIfCallFails` — 중간 Call revert → 전체 revert
6. `test_isValidSignature_owner` — owner sig → `0x1626ba7e`
7. `test_isValidSignature_nonOwner` — 다른 sig → `0xffffffff`
8. `test_factory_deterministicAddress` — getAddress == createAccount address
9. `test_factory_idempotent` — createAccount 두 번 호출 → 동일 주소, no revert
10. `test_factory_ownerCorrect` — 배포된 계정의 owner 확인

Foundry Cheatcodes 활용:
- `vm.prank`, `vm.sign`, `vm.deal`
- MockEntryPoint 작성 (EntryPoint 전체 배포 없이 콜백 시뮬레이션)

**AC:**
- [ ] `forge test --match-path test/GasStationAccount.t.sol -vvv` 가 모두 통과.
- [ ] 10개 테스트 케이스가 모두 존재하고 통과.
- [ ] 테스트 가스 리포트에 `executeBatch` 가 포함된다.

**Test command:**
```bash
cd contracts && forge test --match-path "test/GasStationAccount.t.sol" -vvv 2>&1 | tail -20
```

**Commit message:**
```
test(contracts): add GasStationAccount and Factory unit tests (10 cases)
```

---

## M1.5 — 지원 컨트랙트

### T-008: TokenRegistry.sol 구현 + 테스트

**Milestone:** M1.5
**Effort:** S
**Depends on:** T-002

**Goal:**
허용된 결제 토큰의 decimals, markup, charge 한도를 저장하는 TokenRegistry를 구현한다. Polkadot Hub ERC20 precompile이 `decimals()` 를 노출하지 않으므로 이 레지스트리가 필수적이다.

**Files to create:**
```
contracts/src/TokenRegistry.sol
contracts/test/TokenRegistry.t.sol
```

**Scope:**
```solidity
contract TokenRegistry {
    struct TokenConfig {
        bool    enabled;
        uint8   decimals;       // ERC20 precompile에 decimals()가 없으므로 필수
        uint16  markupBps;      // 페이마스터 안전 마진 (예: 300 = 3%)
        uint256 minMaxCharge;   // quote에서 허용되는 최소 maxTokenCharge
        uint256 maxMaxCharge;   // quote에서 허용되는 최대 maxTokenCharge
    }

    mapping(address => TokenConfig) public tokenConfig;
    address public admin;

    event TokenSet(address indexed token, TokenConfig cfg);
    event TokenDisabled(address indexed token);

    modifier onlyAdmin() { ... }

    constructor(address _admin) { admin = _admin; }

    function setToken(address token, TokenConfig calldata cfg) external onlyAdmin;
    function disableToken(address token) external onlyAdmin;
    function getToken(address token) external view returns (TokenConfig memory);
}
```

테스트 케이스:
1. `test_setToken_andGet` — setToken 후 getToken으로 읽기
2. `test_disableToken` — disableToken 후 enabled == false
3. `test_onlyAdmin_setToken` — 비관리자 → revert
4. `test_onlyAdmin_disableToken` — 비관리자 → revert
5. `test_setToken_emitsEvent`

**AC:**
- [ ] `forge test --match-path test/TokenRegistry.t.sol` 가 모두 통과.
- [ ] `setToken` 이 `onlyAdmin` 으로 보호된다.
- [ ] `disableToken` 이 `enabled = false` 로만 업데이트한다 (삭제 X).
- [ ] 이벤트 `TokenSet`, `TokenDisabled` 가 emit 된다.

**Test command:**
```bash
cd contracts && forge test --match-path "test/TokenRegistry.t.sol" -vvv 2>&1 | tail -10
```

**Commit message:**
```
feat(contracts): implement TokenRegistry with decimals and risk params
```

---

### T-009: CampaignRegistry.sol 구현 + 테스트

**Milestone:** M1.5
**Effort:** M
**Depends on:** T-002

**Goal:**
스폰서 캠페인(예산, 시간창, 허용 대상, 사용자별 쿼터)을 관리하는 CampaignRegistry를 구현한다. 페이마스터가 MODE_SPONSOR 검증 시 이 레지스트리를 읽는다.

**Files to create:**
```
contracts/src/CampaignRegistry.sol
contracts/test/CampaignRegistry.t.sol
```

**Scope:**
```solidity
contract CampaignRegistry {
    struct Campaign {
        bool      enabled;
        uint48    start;
        uint48    end;
        uint256   budget;           // 네이티브 토큰 예산
        uint256   spent;            // 누적 사용량
        address[] allowedTargets;   // 호출 가능한 대상 컨트랙트 주소 목록
        uint32    perUserMaxOps;    // 사용자당 최대 UserOp 수
    }

    mapping(bytes32 => Campaign) public campaigns;
    mapping(bytes32 => mapping(address => uint32)) public userOpsUsed;
    address public admin;

    event CampaignCreated(bytes32 indexed campaignId, Campaign cfg);
    event CampaignFunded(bytes32 indexed campaignId, uint256 amount);
    event CampaignDisabled(bytes32 indexed campaignId);

    function createCampaign(bytes32 campaignId, Campaign calldata cfg) external onlyAdmin;
    function fundCampaign(bytes32 campaignId) external payable onlyAdmin;
    function disableCampaign(bytes32 campaignId) external onlyAdmin;
    function isAllowedTarget(bytes32 campaignId, address target) external view returns (bool);
    function recordUsage(bytes32 campaignId, address user, uint256 gasCost) external onlyPaymaster;
    // onlyPaymaster modifier: 등록된 paymaster 주소만 recordUsage 가능
}
```

테스트 케이스:
1. `test_createCampaign_andGet`
2. `test_fundCampaign`
3. `test_isAllowedTarget_true` / `_false`
4. `test_recordUsage_incrementsSpent`
5. `test_recordUsage_onlyPaymaster`
6. `test_campaign_timeWindow` — start/end 경계값

**AC:**
- [ ] `forge test --match-path test/CampaignRegistry.t.sol` 가 모두 통과.
- [ ] `recordUsage` 가 paymaster만 호출 가능.
- [ ] `isAllowedTarget` 이 `allowedTargets` 배열을 순회하여 결과를 반환한다.
- [ ] `budget >= spent` 불변식이 유지된다 (`recordUsage` 에서 초과 시 revert).

**Test command:**
```bash
cd contracts && forge test --match-path "test/CampaignRegistry.t.sol" -vvv 2>&1 | tail -10
```

**Commit message:**
```
feat(contracts): implement CampaignRegistry with budget, allowlist, and per-user quotas
```

---

### T-010: DemoDapp.sol 구현

**Milestone:** M1.5
**Effort:** S
**Depends on:** T-002

**Goal:**
데모에서 UserOp의 실제 실행 타겟이 되는 간단한 컨트랙트를 구현한다. 허용리스트에 추가되며, 실제 기능보다 on-chain 기록(이벤트)이 목적이다.

**Files to create:**
```
contracts/src/DemoDapp.sol
```

**Scope:**
```solidity
contract DemoDapp {
    event ActionExecuted(address indexed account, string message, uint256 timestamp);

    mapping(address => uint256) public actionCount;

    function execute(string calldata message) external {
        actionCount[msg.sender]++;
        emit ActionExecuted(msg.sender, message, block.timestamp);
    }

    function getActionCount(address account) external view returns (uint256);
}
```

**AC:**
- [ ] `forge build` 에러 없음.
- [ ] `execute` 호출 시 `ActionExecuted` 이벤트가 emit 된다.
- [ ] `actionCount` 가 호출자별로 누적된다.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): implement DemoDapp as safe allowlisted demo target
```

---

## M2 — GasStationPaymaster (핵심)

### T-011: GasStationPaymaster — 구조체 + EIP-712 도메인 + 상수

**Milestone:** M2
**Effort:** M
**Depends on:** T-003, T-004, T-008, T-009

**Goal:**
GasStationPaymaster의 골격을 작성한다. immutable 변수, `PaymasterData` 구조체, EIP-712 도메인 및 type hash 상수, Permit2 witness 관련 상수를 정의한다. 이 티켓에서는 `validatePaymasterUserOp`/`postOp` 로직은 작성하지 않는다.

**Files to create:**
```
contracts/src/GasStationPaymaster.sol
```

**Scope:**
```solidity
contract GasStationPaymaster is IPaymaster {
    // ── 모드 상수 ──────────────────────────────────────────────────────
    uint8 constant MODE_SPONSOR       = 1;
    uint8 constant MODE_TOKEN_PERMIT2 = 2;

    // ── Immutables ─────────────────────────────────────────────────────
    IEntryPoint      public immutable entryPoint;
    address          public immutable treasury;
    address          public immutable quoteSigner;
    address          public immutable permit2;
    TokenRegistry    public immutable tokenRegistry;
    CampaignRegistry public immutable campaignRegistry;

    // ── PaymasterData (paymasterAndData[20:] decode 대상) ──────────────
    struct PaymasterData {
        uint8   mode;
        uint48  validUntil;
        bytes   signature;        // quoteSigner ECDSA

        // MODE_SPONSOR
        bytes32 campaignId;

        // MODE_TOKEN_PERMIT2
        address token;
        uint256 maxTokenCharge;
        uint256 tokenPerNativeScaled; // token-smallest per native-smallest × 1e18
        uint256 permit2Nonce;
        uint256 permit2Deadline;
        bytes   permit2Signature;
    }

    // ── EIP-712 도메인 ─────────────────────────────────────────────────
    bytes32 private immutable _DOMAIN_SEPARATOR;

    bytes32 constant TOKEN_QUOTE_TYPEHASH = keccak256(
        "TokenQuote(address sender,bytes32 callDataHash,address token,"
        "uint48 validUntil,uint256 maxTokenCharge,uint256 tokenPerNativeScaled,"
        "uint256 permit2Nonce,uint256 permit2Deadline)"
    );

    bytes32 constant SPONSOR_QUOTE_TYPEHASH = keccak256(
        "SponsorQuote(address sender,bytes32 callDataHash,bytes32 campaignId,uint48 validUntil)"
    );

    // ── Permit2 witness 상수 ───────────────────────────────────────────
    bytes32 constant GAS_STATION_WITNESS_TYPEHASH = keccak256(
        "GasStationWitness(address sender,bytes32 callDataHash,"
        "address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
    );

    string constant WITNESS_TYPESTRING =
        "GasStationWitness witness)"
        "GasStationWitness(address sender,bytes32 callDataHash,"
        "address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
        "TokenPermissions(address token,uint256 amount)";

    // ── 안전 상수 ─────────────────────────────────────────────────────
    uint256 constant MAX_CALLDATA_BYTES = 8192;

    // ── 이벤트 ────────────────────────────────────────────────────────
    event TokenGasPaid(address indexed sender, address indexed token, uint256 charge, uint256 gasCost);
    event Sponsored(address indexed sender, bytes32 indexed campaignId, uint256 gasCost);

    constructor(...) { ... }

    // ── 도메인 separator ──────────────────────────────────────────────
    function _buildDomainSeparator() private view returns (bytes32) { ... }
    function domainSeparator() external view returns (bytes32) { ... }

    // ── 헬퍼: quote sig 검증 ──────────────────────────────────────────
    function _verifyTokenQuote(...) internal view { ... }
    function _verifySponsoorQuote(...) internal view { ... }

    // ── 헬퍼: witness 계산 ────────────────────────────────────────────
    function _computeWitness(...) internal view returns (bytes32) { ... }

    // 스텁: 다음 티켓에서 구현
    function validatePaymasterUserOp(...) external override returns (bytes memory, uint256) { revert("not implemented"); }
    function postOp(...) external override { revert("not implemented"); }
}
```

**AC:**
- [ ] `forge build` 에러 없음.
- [ ] `TOKEN_QUOTE_TYPEHASH` 값이 PROJECT.md 스펙과 일치 (테스트로 확인).
- [ ] `GAS_STATION_WITNESS_TYPEHASH` 값이 PROJECT.md 스펙과 일치.
- [ ] EIP-712 도메인의 `name="GasStationPaymaster"`, `version="1"`, `chainId=block.chainid`, `verifyingContract=address(this)`.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): add GasStationPaymaster skeleton with EIP-712 domain and type hashes
```

---

### T-012: GasStationPaymaster — MODE_TOKEN_PERMIT2 구현

**Milestone:** M2
**Effort:** L
**Depends on:** T-011

**Goal:**
`validatePaymasterUserOp` (MODE_TOKEN_PERMIT2) 와 `postOp` (토큰 정산) 를 완전히 구현한다. Permit2 witness 서명 검증, calldata 크기 제한, executeBatch allowlist 검사, postOp ceiling 라운딩 정산이 포함된다.

**Files to modify:**
```
contracts/src/GasStationPaymaster.sol    # T-011 스텁 교체
```

**Scope (validatePaymasterUserOp — MODE_TOKEN_PERMIT2):**
1. `abi.decode(userOp.paymasterAndData[20:], (PaymasterData))` 로 데이터 파싱
2. `block.timestamp > validUntil` → revert ("expired")
3. `tokenRegistry.tokenConfig[token].enabled` → false면 revert
4. `userOp.callData.length > MAX_CALLDATA_BYTES` → revert
5. `callDataHash = keccak256(userOp.callData)`
6. paymaster quote 서명 검증 (`_verifyTokenQuote`)
7. Permit2 witness 해시 계산 (`_computeWitness`)
8. Permit2 EIP-712 digest 계산 (PROJECT.md §6.6 스펙 그대로):
   ```
   TOKEN_PERMISSIONS_TYPEHASH = keccak256("TokenPermissions(address token,uint256 amount)")
   typeHash = keccak256(PERMIT_WITNESS_STUB ++ WITNESS_TYPESTRING)
   dataHash = keccak256(abi.encode(typeHash, tokenPermissionsHash, paymaster, nonce, deadline, witness))
   digest = keccak256("\x19\x01" ++ permit2.DOMAIN_SEPARATOR() ++ dataHash)
   ```
9. `SignatureChecker.isValidSignatureNow(sender, digest, permit2Signature)` 검증
10. executeBatch calldata decode → `Call[]` 확인 → 각 `Call.to` 가 토큰 approve 예외 또는 allowlisted target인지 검사
11. context 반환: `abi.encode(token, maxTokenCharge, tokenPerNativeScaled, permit2Nonce, permit2Deadline, permit2Signature, sender, callDataHash, validUntil)`
12. `validationData`: `_packValidationData(0, validUntil, 0)` (ERC-4337 표준 인코딩)

**Scope (postOp — MODE_TOKEN_PERMIT2):**
```solidity
// 1. context decode
// 2. gas → token 변환 (ceiling 라운딩)
uint256 raw    = (actualGasCost * tokenPerNativeScaled + 1e18 - 1) / 1e18;  // ceiling!
uint16  markup = tokenRegistry.tokenConfig[token].markupBps;
uint256 charge = raw + (raw * markup + 9999) / 10_000;                       // ceiling!
if (charge > maxTokenCharge) charge = maxTokenCharge;

// 3. Permit2 signatureTransfer 호출
IPermit2(permit2).permitWitnessTransferFrom(
    PermitTransferFrom({ permitted: TokenPermissions({ token: token, amount: maxTokenCharge }), nonce: permit2Nonce, deadline: permit2Deadline }),
    SignatureTransferDetails({ to: treasury, requestedAmount: charge }),
    sender,
    witness,
    WITNESS_TYPESTRING,
    permit2Signature
);

emit TokenGasPaid(sender, token, charge, actualGasCost);
```

**중요 불변식:**
- `charge` 는 항상 ceiling 라운딩 (페이마스터 보호)
- Permit2 호출은 `postOp` 내부에서만 발생
- `postOp` 는 `onlyEntryPoint` modifier 적용

**AC:**
- [ ] 유효한 PaymasterData + permit2Signature → `validatePaymasterUserOp` 통과.
- [ ] 만료된 `validUntil` → revert.
- [ ] 비활성화 토큰 → revert.
- [ ] 잘못된 permit2 서명 → revert.
- [ ] executeBatch 중 non-allowlisted target → revert.
- [ ] `postOp` 에서 `charge <= maxTokenCharge` 항상 보장.
- [ ] `raw` 와 `charge` 모두 ceiling 라운딩 (테스트에서 정수 산술 검증).

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): implement GasStationPaymaster MODE_TOKEN_PERMIT2 validate and postOp
```

---

### T-013: GasStationPaymaster — MODE_SPONSOR 구현

**Milestone:** M2
**Effort:** M
**Depends on:** T-012

**Goal:**
스폰서 모드의 `validatePaymasterUserOp` 검증과 `postOp` 사용 기록을 구현한다. 캠페인 시간창, target allowlist, 사용자별 쿼터를 on-chain에서 검증한다.

**Files to modify:**
```
contracts/src/GasStationPaymaster.sol
```

**Scope (validatePaymasterUserOp — MODE_SPONSOR):**
1. `PaymasterData` 파싱
2. `block.timestamp > validUntil` → revert
3. `campaignRegistry.campaigns[campaignId].enabled` → false면 revert
4. `block.timestamp < start || block.timestamp > end` → revert
5. `callDataHash = keccak256(userOp.callData)`
6. paymaster quote 서명 검증 (`_verifySponsorQuote`)
7. executeBatch calldata decode → 각 `Call.to` 가 캠페인의 `allowedTargets` 에 있는지 확인
8. 사용자별 쿼터 확인: `userOpsUsed[campaignId][sender] < campaign.perUserMaxOps`
9. 예산 확인: `campaign.budget >= campaign.spent + estimatedGas`
10. context 반환: `abi.encode(campaignId, sender, estimatedGas)`
11. `validationData`: `_packValidationData(0, validUntil, 0)`

**Scope (postOp — MODE_SPONSOR):**
```solidity
// campaignRegistry.recordUsage(campaignId, sender, actualGasCost)
emit Sponsored(sender, campaignId, actualGasCost);
```

**AC:**
- [ ] 유효한 캠페인 + 올바른 quote sig → validate 통과.
- [ ] 만료된 캠페인 시간창 → revert.
- [ ] non-allowlisted target → revert.
- [ ] 쿼터 초과 → revert.
- [ ] 예산 초과 → revert.
- [ ] `postOp` 에서 `campaign.spent` 가 증가한다 (CampaignRegistry를 통해).
- [ ] `Sponsored` 이벤트 emit.

**Test command:**
```bash
cd contracts && forge build 2>&1 | grep -E "^error"
```

**Commit message:**
```
feat(contracts): implement GasStationPaymaster MODE_SPONSOR validate and postOp
```

---

### T-014: GasStationPaymaster 전체 테스트

**Milestone:** M2
**Effort:** L
**Depends on:** T-012, T-013

**Goal:**
페이마스터의 모든 검증 경로, Permit2 digest 계산, postOp 정산을 포함한 완전한 테스트 스위트를 작성한다. off-chain 타입드 데이터와 on-chain digest가 일치함을 검증한다.

**Files to create:**
```
contracts/test/GasStationPaymaster.t.sol    # 전체 유닛 테스트
contracts/test/Permit2Digest.t.sol          # off-chain/on-chain digest 일치 검증
contracts/test/PostOpSettlement.t.sol       # postOp 정산 단독 테스트
```

**Scope:**

`GasStationPaymaster.t.sol` 테스트 케이스:
1. `test_tokenMode_validateOk` — 완전한 유효 UserOp → context 반환 확인
2. `test_tokenMode_expiredValidUntil` → revert
3. `test_tokenMode_disabledToken` → revert
4. `test_tokenMode_invalidQuoteSig` → revert
5. `test_tokenMode_invalidPermit2Sig` → revert
6. `test_tokenMode_nonAllowlistedTarget` → revert
7. `test_sponsorMode_validateOk`
8. `test_sponsorMode_expiredCampaign` → revert
9. `test_sponsorMode_quotaExceeded` → revert
10. `test_sponsorMode_budgetExceeded` → revert

`Permit2Digest.t.sol` 테스트:
- TypeScript/off-chain에서 계산한 expected digest와 `_computeWitness()` + EIP-712 digest 결과를 hardcode 비교
- 주석에 계산 과정 명시
- 이 테스트가 통과하면 API ↔ 컨트랙트 호환성 보장

`PostOpSettlement.t.sol` 테스트:
1. `test_postOp_chargeAtCeiling` — charge가 maxTokenCharge에 cap 됨
2. `test_postOp_chargeRounding` — ceiling 라운딩 검증 (특수 경수 포함)
3. `test_postOp_onlyEntryPoint` — 외부 호출 revert
4. `test_postOp_permit2CalledCorrectly` — MockPermit2로 호출 인자 검증

**AC:**
- [ ] `forge test -vvv` 가 전체 통과.
- [ ] `Permit2Digest.t.sol` 의 expected digest 값이 off-chain 계산값과 일치.
- [ ] ceiling 라운딩 테스트가 정수 경계 케이스(remainder=1, remainder=0) 모두 포함.
- [ ] 각 파일에 최소 4개 이상 테스트 케이스.

**Test command:**
```bash
cd contracts && forge test -vvv 2>&1 | tail -30
```

**Commit message:**
```
test(contracts): add full paymaster test suite (validate, Permit2 digest, postOp settlement)
```

---

### T-015: Deploy.s.sol — Foundry 배포 스크립트

**Milestone:** M2
**Effort:** M
**Depends on:** T-014

**Goal:**
전체 컨트랙트를 올바른 순서로 배포하는 Foundry script를 작성한다. 배포 후 주소를 `deployments/testnet.json` 에 저장한다.

**Files to create:**
```
contracts/script/Deploy.s.sol
contracts/.env.example              # PRIVATE_KEY, 배포자 주소 추가
deployments/.gitkeep
```

**Scope:**
배포 순서 (의존성 기준):
1. `EntryPoint` — account-abstraction 라이브러리에서 가져오거나 직접 배포
2. `Permit2` — 벤더 소스에서 배포 (Hub에 아직 없는 경우) / 이미 배포된 경우 주소만 사용
3. `TokenRegistry(admin=deployer)`
4. `CampaignRegistry(admin=deployer, paymaster=TBD)`
5. `GasStationFactory(entryPoint)`
6. `GasStationPaymaster(entryPoint, treasury, quoteSigner, permit2, tokenRegistry, campaignRegistry)`
7. `CampaignRegistry.setPaymaster(paymaster)` — 순환 의존성 해결
8. `DemoDapp`

스크립트 출력:
```json
{
  "chainId": 420420417,
  "entryPoint": "0x...",
  "permit2": "0x...",
  "tokenRegistry": "0x...",
  "campaignRegistry": "0x...",
  "factory": "0x...",
  "paymaster": "0x...",
  "demoDapp": "0x...",
  "deployedAt": "2026-..."
}
```
→ `deployments/testnet.json` 에 기록 (vm.writeJson 사용)

**AC:**
- [ ] `forge script script/Deploy.s.sol --rpc-url $RPC_URL_TESTNET --broadcast` 로컬 anvil 시뮬레이션 통과.
- [ ] 배포 순서가 의존성 역순이 아님 (EntryPoint → Permit2 → Registry → Paymaster).
- [ ] `deployments/testnet.json` 이 올바른 구조로 생성된다.
- [ ] CampaignRegistry의 paymaster 주소가 배포 후 올바르게 설정된다.

**Test command:**
```bash
cd contracts && forge script script/Deploy.s.sol --fork-url http://127.0.0.1:8545 2>&1 | tail -20
```

**Commit message:**
```
feat(contracts): add Deploy.s.sol with ordered deployment and testnet.json output
```

---

## M3 — Paymaster API

### T-016: packages/shared — ABI + TypeScript 타입 + Permit2 헬퍼

**Milestone:** M3
**Effort:** M
**Depends on:** T-014

**Goal:**
API와 프론트엔드가 공유하는 TypeScript 패키지를 만든다. 컨트랙트 ABI, UserOperation 타입, Permit2 타입드데이터 생성 헬퍼, paymasterAndData 인코딩 함수를 포함한다.

**Files to create:**
```
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/
  abis/
    GasStationPaymaster.abi.json      # forge build 결과에서 추출
    TokenRegistry.abi.json
    CampaignRegistry.abi.json
    GasStationAccount.abi.json
    GasStationFactory.abi.json
    DemoDapp.abi.json
  types.ts                            # PaymasterData, UserOperation TS 타입
  permit2.ts                          # Permit2 typed data builder
  paymaster.ts                        # paymasterAndData encoder/decoder
  userOp.ts                           # UserOperation helper
  index.ts
```

**Scope:**

`types.ts`:
```typescript
export interface PaymasterData {
  mode: 1 | 2;
  validUntil: bigint;
  signature: Hex;
  // MODE_SPONSOR
  campaignId?: Hex;
  // MODE_TOKEN_PERMIT2
  token?: Address;
  maxTokenCharge?: bigint;
  tokenPerNativeScaled?: bigint;
  permit2Nonce?: bigint;
  permit2Deadline?: bigint;
  permit2Signature?: Hex;
}

export interface UserOp {
  sender: Address;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}
```

`permit2.ts`:
- `buildPermit2TypedData(params: {...}): TypedData` — viem 형식 EIP-712 타입드 데이터 반환
- `buildWitness(params: {...}): Hex` — witness hash 계산 (keccak256)
- `encodePermit2Signature(sig: Hex): Hex`

`paymaster.ts`:
- `encodePaymasterAndData(paymasterAddress: Address, data: PaymasterData): Hex`
- `decodePaymasterAndData(raw: Hex): { paymasterAddress: Address; data: PaymasterData }`

**AC:**
- [ ] `pnpm --filter @dotfuel/shared build` 에러 없음.
- [ ] `buildPermit2TypedData` 반환값이 viem `signTypedData` 에 바로 넣을 수 있는 형태.
- [ ] `encodePaymasterAndData` → `decodePaymasterAndData` 라운드트립이 동일값.
- [ ] ABI 파일이 `contracts/out/` 에서 올바르게 추출된 것임.

**Test command:**
```bash
pnpm --filter @dotfuel/shared build 2>&1 | tail -10
```

**Commit message:**
```
feat(shared): add ABI exports, TypeScript types, and Permit2 typed-data helpers
```

---

### T-017: paymaster-api — 서버 스캘폴드 + 헬스체크

**Milestone:** M3
**Effort:** S
**Depends on:** T-016

**Goal:**
Express 또는 Hono 기반 paymaster API 서버의 기본 구조를 설정한다. 환경변수 로딩, viem PublicClient 초기화, `/healthz` 엔드포인트를 포함한다.

**Files to create:**
```
apps/paymaster-api/package.json
apps/paymaster-api/tsconfig.json
apps/paymaster-api/src/
  index.ts               # 서버 진입점
  config.ts              # env 변수 파싱 + 검증
  client.ts              # viem PublicClient + WalletClient (quoteSigner)
  routes/
    health.ts
  middleware/
    errorHandler.ts
apps/paymaster-api/.env.example
```

**Scope:**
환경변수 (`.env.example`):
```
RPC_URL_TESTNET=https://eth-rpc-testnet.polkadot.io/
CHAIN_ID=420420417
PAYMASTER_ADDRESS=0x...
PERMIT2_ADDRESS=0x...
QUOTE_SIGNER_PRIVATE_KEY=0x...
TOKEN_REGISTRY_ADDRESS=0x...
CAMPAIGN_REGISTRY_ADDRESS=0x...
ENTRYPOINT_ADDRESS=0x...
TREASURY_ADDRESS=0x...
PORT=3001
QUOTE_TTL_SECONDS=300
```

`config.ts`: zod 스키마로 env 검증; 누락 시 즉시 종료
`client.ts`: `createPublicClient({ chain: polkadotHub, transport: http(RPC_URL_TESTNET) })`
`GET /healthz`: `{ status: "ok", chainId, paymasterAddress, blockNumber }` 반환

**AC:**
- [ ] `pnpm --filter paymaster-api dev` 실행 → 포트 3001 listen.
- [ ] `curl http://localhost:3001/healthz` → `200 { "status": "ok" }`.
- [ ] env 누락 시 startup에서 에러 메시지 출력 후 종료.

**Test command:**
```bash
pnpm --filter paymaster-api build 2>&1 | tail -5
```

**Commit message:**
```
feat(api): scaffold paymaster-api with env config, viem client, and healthz endpoint
```

---

### T-018: paymaster-api — POST /v1/quote/token

**Milestone:** M3
**Effort:** L
**Depends on:** T-017

**Goal:**
토큰 모드 quote 엔드포인트를 구현한다. 요청으로 받은 sender/callData/token으로 가스 추정 → exchange rate 계산 → EIP-712 quote 서명 → Permit2 타입드 데이터 생성 → 응답을 구성한다.

**Files to create:**
```
apps/paymaster-api/src/
  routes/quote.ts
  services/
    gasEstimator.ts        # eth_estimateUserOperationGas wrapper
    quoteBuilder.ts        # token quote 생성 로직
    nonceAllocator.ts      # Permit2 nonce 관리 (in-memory for hackathon)
```

**Scope:**
`POST /v1/quote/token` 요청:
```json
{
  "chainId": 420420417,
  "sender": "0x...",
  "callData": "0x...",
  "initCode": "0x...",
  "token": "0x...",
  "maxFeePerGas": "0x...",
  "maxPriorityFeePerGas": "0x..."
}
```

처리 순서:
1. 입력 검증 (zod)
2. `TokenRegistry.getToken(token)` 읽기 → enabled 확인
3. `eth_estimateUserOperationGas` 호출 (가스 추정)
4. `tokenPerNativeScaled` 계산 (하드코딩 환율 또는 간단한 가격 피드 — 해커톤 목적이므로 하드코딩 허용)
5. `maxTokenCharge` = `estimatedGas * tokenPerNativeScaled / 1e18 * (1 + markupBps/10000)` ceiling
6. `validUntil` = `now + QUOTE_TTL_SECONDS`
7. `callDataHash` = `keccak256(callData)`
8. Permit2 nonce 할당 (`nonceAllocator.allocate(sender)`)
9. EIP-712 `TokenQuote` 해시 서명 (quoteSigner WalletClient)
10. Permit2 타입드 데이터 생성 (`permit2.ts` 헬퍼 사용)
11. `paymasterAndDataNoPermitSig` 인코딩 (permit2Signature 없이)
12. 응답 반환

`nonceAllocator.ts`:
- 인메모리 Map: `Map<sender, Set<usedNonces>>`
- nonce는 랜덤 uint256 (충돌 확률 무시해도 됨)

**AC:**
- [ ] `POST /v1/quote/token` → 200 + 올바른 응답 구조.
- [ ] 비활성화 토큰 → 400 에러.
- [ ] `paymasterSignature` 가 quoteSigner 키로 복원 가능.
- [ ] `permit2TypedData` 가 viem `signTypedData` 와 호환되는 형태.
- [ ] `maxTokenCharge` 가 ceiling 라운딩으로 계산됨.

**Test command:**
```bash
curl -X POST http://localhost:3001/v1/quote/token \
  -H "Content-Type: application/json" \
  -d '{"chainId":420420417,"sender":"0x1234","callData":"0x","initCode":"0x","token":"0xABCD","maxFeePerGas":"0x1","maxPriorityFeePerGas":"0x1"}' \
  2>&1 | jq .
```

**Commit message:**
```
feat(api): implement POST /v1/quote/token with EIP-712 signing and Permit2 typed data
```

---

### T-019: paymaster-api — POST /v1/quote/sponsor

**Milestone:** M3
**Effort:** M
**Depends on:** T-017

**Goal:**
스폰서 모드 quote 엔드포인트를 구현한다. 캠페인 상태 확인 → SponsorQuote EIP-712 서명 → paymasterAndData 반환.

**Files to create:**
```
apps/paymaster-api/src/services/sponsorQuoteBuilder.ts
```

**Files to modify:**
```
apps/paymaster-api/src/routes/quote.ts    # /v1/quote/sponsor 라우트 추가
```

**Scope:**
`POST /v1/quote/sponsor` 요청:
```json
{
  "chainId": 420420417,
  "sender": "0x...",
  "callData": "0x...",
  "initCode": "0x...",
  "campaignId": "0x..."
}
```

처리 순서:
1. 입력 검증
2. `CampaignRegistry.campaigns[campaignId]` 읽기 → enabled/time window/budget 확인
3. `callDataHash` = `keccak256(callData)`
4. `validUntil` = `min(now + QUOTE_TTL_SECONDS, campaign.end)`
5. EIP-712 `SponsorQuote` 해시 서명
6. `paymasterAndData` 인코딩 (full — permit2 서명 불필요)
7. 응답 반환

**AC:**
- [ ] 유효한 캠페인 → 200 + `paymasterAndData`.
- [ ] 비활성화 캠페인 → 400.
- [ ] `validUntil` 이 캠페인 종료 시간을 초과하지 않는다.
- [ ] `paymasterSignature` 가 quoteSigner로 복원 가능.

**Test command:**
```bash
pnpm --filter paymaster-api build 2>&1 | tail -5
```

**Commit message:**
```
feat(api): implement POST /v1/quote/sponsor with campaign validation and EIP-712 signing
```

---

### T-020: paymaster-api — 캠페인 어드민 엔드포인트

**Milestone:** M3
**Effort:** M
**Depends on:** T-017

**Goal:**
스폰서가 캠페인을 생성/펀딩/허용리스트 설정/조회할 수 있는 어드민 API를 구현한다.

**Files to create:**
```
apps/paymaster-api/src/routes/campaign.ts
apps/paymaster-api/src/services/campaignService.ts
```

**Scope:**
- `POST /v1/campaign/create` — CampaignRegistry.createCampaign 트랜잭션 전송
- `POST /v1/campaign/fund` — CampaignRegistry.fundCampaign + ETH 송금
- `POST /v1/campaign/allowlist` — allowedTargets 업데이트
- `GET  /v1/campaign/:id/status` — campaigns[] 상태 + userOpsUsed 조회

모든 변경 트랜잭션은 admin WalletClient로 서명 (`ADMIN_PRIVATE_KEY` env 추가).

**AC:**
- [ ] `POST /v1/campaign/create` → 트랜잭션 해시 반환.
- [ ] `GET /v1/campaign/:id/status` → `{ enabled, budget, spent, remainingBudget }`.
- [ ] admin 키 없이 변경 요청 시 401.

**Test command:**
```bash
pnpm --filter paymaster-api build 2>&1 | tail -5
```

**Commit message:**
```
feat(api): add campaign admin endpoints (create, fund, allowlist, status)
```

---

## M3.5 — 인프라

### T-021: docker-compose (bundler + paymaster-api)

**Milestone:** M3.5
**Effort:** M
**Depends on:** T-017

**Goal:**
ERC-4337 bundler와 paymaster-api를 단일 `docker-compose up` 으로 실행할 수 있도록 설정한다.

**Files to create:**
```
docker/docker-compose.yml
docker/.env.example
docker/paymaster-api.Dockerfile
```

**Scope:**
`docker-compose.yml`:
```yaml
services:
  bundler:
    image: stackup/stackup-bundler:latest   # 또는 alto/silius
    environment:
      - ERC4337_BUNDLER_ETH_CLIENT_URL=${RPC_URL_TESTNET}
      - ERC4337_BUNDLER_PRIVATE_KEY=${BUNDLER_PRIVATE_KEY}
      - ERC4337_BUNDLER_MAX_BATCH_GAS_LIMIT=5000000
    ports:
      - "4337:4337"

  paymaster-api:
    build:
      context: ..
      dockerfile: docker/paymaster-api.Dockerfile
    env_file: .env
    ports:
      - "3001:3001"
    depends_on:
      - bundler
```

`docker/.env.example`: bundler private key 추가된 env 템플릿

**AC:**
- [ ] `docker-compose -f docker/docker-compose.yml up` 가 두 서비스를 모두 시작한다.
- [ ] bundler가 Hub TestNet RPC에 연결된다.
- [ ] `curl http://localhost:3001/healthz` → `200 ok`.
- [ ] bundler의 `eth_supportedEntryPoints` 가 EntryPoint 주소를 반환한다.

**Test command:**
```bash
docker-compose -f docker/docker-compose.yml config 2>&1 | tail -5
```

**Commit message:**
```
feat(infra): add docker-compose with ERC-4337 bundler and paymaster-api services
```

---

### T-022: scripts/bootstrap-assets.ts

**Milestone:** M3.5
**Effort:** M
**Depends on:** T-001

**Goal:**
Polkadot Hub Assets pallet에 tUSDT 테스트 토큰을 생성하고, 테스트 계정들에게 민팅하며, ERC20 precompile 주소를 계산하고, TokenRegistry에 등록하는 스크립트를 작성한다.

**Files to create:**
```
scripts/package.json
scripts/tsconfig.json
scripts/bootstrap-assets.ts
scripts/lib/
  precompile.ts       # ERC20 precompile 주소 계산 공식
  assetsPallet.ts     # Assets pallet extrinsic 헬퍼
```

**Scope:**
```typescript
// bootstrap-assets.ts
// 1. WSS 연결: wss://asset-hub-paseo-rpc.n.dwellir.com
// 2. Create asset (Assets.create) → assetId 기록
// 3. Set metadata (Assets.setMetadata): name="Test USDT", symbol="tUSDT", decimals=6
// 4. Mint to: deployer EOA, counterfactual smart account, test user EOA
// 5. Compute ERC20 precompile address
// 6. Register in TokenRegistry (via viem + ABI)
// Output: assetId, precompileAddress, txHashes
```

`precompile.ts`:
```typescript
// address = 0x[assetId 8hex][24 zeros][prefix 8hex]
// Polkadot Hub prefix: 01200000 (ERC20 precompile prefix)
export function assetIdToPrecompileAddress(assetId: number): Address {
  const assetHex = assetId.toString(16).padStart(8, "0");
  return `0x${assetHex}${"0".repeat(24)}01200000` as Address;
}
```

**AC:**
- [ ] `pnpm --filter scripts bootstrap-assets` 가 에러 없이 실행 (실제 WSS 없이 dry-run 모드 지원).
- [ ] `assetIdToPrecompileAddress(1984)` → `0x000007C000000000000000000000000001200000`.
- [ ] 스크립트 완료 시 assetId, precompileAddress, txHashes 가 stdout 출력.
- [ ] `scripts/precompile.ts` 의 변환 공식이 PROJECT.md §4 스펙과 일치.

**Test command:**
```bash
cd scripts && pnpm ts-node -e "
  const { assetIdToPrecompileAddress } = require('./lib/precompile');
  const addr = assetIdToPrecompileAddress(1984);
  console.assert(addr === '0x000007C000000000000000000000000001200000', 'FAIL: ' + addr);
  console.log('PASS:', addr);
"
```

**Commit message:**
```
feat(scripts): add bootstrap-assets.ts for Assets pallet token creation and TokenRegistry registration
```

---

### T-023: scripts/compute-precompile-address.ts

**Milestone:** M3.5
**Effort:** S
**Depends on:** T-022

**Goal:**
assetId를 입력받아 ERC20 precompile 주소를 출력하는 CLI 유틸리티를 추가한다.

**Files to create:**
```
scripts/compute-precompile-address.ts
```

**Scope:**
```bash
pnpm --filter scripts compute-precompile-address 1984
# Output:
# Asset ID:          1984 (0x7C0)
# Precompile address: 0x000007C000000000000000000000000001200000
```

`lib/precompile.ts` 의 `assetIdToPrecompileAddress` 재사용.

**AC:**
- [ ] `pnpm compute-precompile-address 1984` → 정확한 주소 출력.
- [ ] 잘못된 입력(음수, 비정수) → 에러 메시지 + exit code 1.

**Test command:**
```bash
cd scripts && npx ts-node compute-precompile-address.ts 1984 2>&1
```

**Commit message:**
```
feat(scripts): add compute-precompile-address CLI utility
```

---

## M4 — demo-web

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
