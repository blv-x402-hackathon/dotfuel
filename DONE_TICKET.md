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

