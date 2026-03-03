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

