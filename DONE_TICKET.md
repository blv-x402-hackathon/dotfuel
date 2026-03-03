# DONE_TICKET.md — Completed Tickets

### T-001: pnpm 모노레포 루트 설정

**Milestone:** M0
**Effort:** S
**Depends on:** 없음

**Goal:**
pnpm 워크스페이스 모노레포 루트를 초기화한다. `contracts/`, `apps/demo-web/`, `apps/paymaster-api/`, `packages/shared/`, `scripts/` 패키지를 워크스페이스로 등록한다.

**Files to create:**
```
pnpm-workspace.yaml
package.json                   # root (private: true, scripts: lint/test/build)
.gitignore
.nvmrc                         # "22.5"
tsconfig.base.json             # paths/moduleResolution 기본값
.env.example                   # 루트 레벨 (chainId, RPC_URL 등 공통값)
```

**Scope:**
- `pnpm-workspace.yaml`: packages 항목에 `apps/*`, `packages/*`, `scripts` 등록
- root `package.json`: `"private": true`, `engines: { node: ">=22.5" }`, `devDependencies: typescript, @types/node`
- `.gitignore`: `node_modules/`, `dist/`, `.env`, `out/`, `cache/`, `broadcast/`, `deployments/testnet.json`
- `.nvmrc`: `22.5`
- `tsconfig.base.json`: `"target": "ES2022"`, `"moduleResolution": "bundler"`, `"strict": true`
- `.env.example`:
  ```
  RPC_URL_TESTNET=https://eth-rpc-testnet.polkadot.io/
  CHAIN_ID=420420417
  ```

**AC:**
- [ ] `pnpm install` 이 루트에서 에러 없이 실행된다.
- [ ] `pnpm-workspace.yaml` 이 `apps/*`, `packages/*`, `scripts` 를 포함한다.
- [ ] `.gitignore` 에 `.env`, `node_modules/`, Foundry 아티팩트(`out/`, `cache/`)가 포함된다.

**Test command:**
```bash
pnpm install --frozen-lockfile 2>&1 | tail -5
```

**Commit message:**
```
chore(repo): init pnpm monorepo workspace with root config
```

---


---

### T-002: Foundry 프로젝트 초기화

**Milestone:** M0
**Effort:** S
**Depends on:** T-001

**Goal:**
`contracts/` 디렉터리에 Foundry 프로젝트를 초기화하고, ERC-4337 EntryPoint 소스를 의존성으로 등록하며, Solidity remappings와 기본 build 설정을 완성한다.

**Files to create:**
```
contracts/foundry.toml
contracts/remappings.txt
contracts/.env.example
contracts/src/.gitkeep           # src 디렉터리 placeholder
contracts/test/.gitkeep
contracts/script/.gitkeep
contracts/lib/                   # forge install 결과
```

**Scope:**
- `forge init contracts --no-git` 실행 후 샘플 파일(Counter.sol 등) 삭제
- `foundry.toml`:
  ```toml
  [profile.default]
  src      = "src"
  out      = "out"
  libs     = ["lib"]
  solc     = "0.8.17"
  via_ir   = false
  optimizer = true
  optimizer_runs = 200

  [profile.default.fuzz]
  runs = 256
  ```
- `forge install eth-infinitism/account-abstraction --no-commit` (ERC-4337 EntryPoint)
- `remappings.txt`:
  ```
  @account-abstraction/=lib/account-abstraction/
  @permit2/=contracts/vendor/permit2/
  ```
- `contracts/.env.example`:
  ```
  PRIVATE_KEY=0x...
  RPC_URL_TESTNET=https://eth-rpc-testnet.polkadot.io/
  CHAIN_ID=420420417
  ETHERSCAN_API_KEY=
  ```

**AC:**
- [ ] `cd contracts && forge build` 가 에러 없이 실행된다.
- [ ] `lib/account-abstraction/` 디렉터리가 존재한다.
- [ ] `foundry.toml` 에 `solc = "0.8.17"` 이 명시된다.
- [ ] `remappings.txt` 에 `@account-abstraction/` 와 `@permit2/` 경로가 포함된다.

**Test command:**
```bash
cd contracts && forge build 2>&1 | tail -10
```

**Commit message:**
```
chore(contracts): init foundry project with account-abstraction dependency
```

---


---

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


---

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


---

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


---

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


---

