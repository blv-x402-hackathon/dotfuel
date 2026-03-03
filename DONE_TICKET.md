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

