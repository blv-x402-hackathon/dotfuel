# PROJECT.md — DotFuel: Universal Gas Station Paymaster for Polkadot Hub

---

## 0) Hackathon Context & Positioning

**Event:** Polkadot Solidity Hackathon APAC 2026 (Feb 15 – Mar 24, 2026)
**Primary Track:** Track 1 — EVM Smart Contracts (DeFi infrastructure)
**Secondary Angle:** Track 2 bonus — Polkadot native asset precompile integration

### Why DotFuel wins

| Judging Dimension | DotFuel's Answer |
|---|---|
| **Technical Innovation** | First ERC-4337 paymaster on Polkadot Hub; Permit2 witness binding uniquely solves replay safety without a custom escrow |
| **Polkadot-Native** | Directly consumes Assets pallet tokens via ERC20 precompile as gas payment; no bridge, no wrapping |
| **User Value** | A wallet with 0 PAS/DOT can execute any dApp action — the single most critical onboarding blocker removed |
| **Production Quality** | Full stack: Solidity contracts + bundler + paymaster API + demo frontend — all dockerized |
| **Ecosystem Impact** | Any Polkadot parachain token that lands on Asset Hub can become a gas token; sets the standard for AA on Hub |

### Pitch (30 seconds)

> "Every new user on Polkadot Hub hits the same wall: they need PAS to pay gas before they can do anything.
> DotFuel breaks that wall. It's an ERC-4337 gas station that lets users pay gas with any Asset Hub token — USDT, DOT derivatives, or any parachain token bridged via XCM — using Permit2 signatures so no token approval lock-in is required.
> Sponsors can also cover gas for their users during onboarding campaigns.
> Today's demo: a wallet with zero PAS executes a dApp call, paying gas in tUSDT."

---

## 1) Product Definition

### One-liner

A production-lean ERC-4337 stack on **Polkadot Hub (EVM)** that lets users execute dApp actions **with zero native gas token** by paying gas in **any supported ERC-20 token** (including Assets pallet precompile tokens), with **Permit2-based post-op settlement** and optional **dApp sponsorship campaigns**.

### Core Promise (must be true in demo)

- A wallet with **0 PAS/DOT** can still execute a transaction on Polkadot Hub.
- Gas is paid either:
    - **by sponsor budget** (campaign), or
    - **in an ERC-20 token** (e.g., a token mapped from Assets pallet via ERC20 precompile).
- Token settlement is done via **Permit2 (mandatory)** with:
    - signature-based transfer (no pre-approval escrow),
    - replay protection (nonce + deadline),
    - spender binding (paymaster),
    - additional binding via **witness** (sender + callDataHash + limits).

### What makes this Polkadot-native

1. **Assets pallet → ERC20 precompile**: Assets created on Asset Hub are exposed as deterministic ERC20 addresses. DotFuel's TokenRegistry stores the decimals/symbol metadata that the precompile omits, enabling a fully on-chain registry without any centralized metadata server.
2. **XCM-ready design** (stretch): The paymaster accept-list can include tokens bridged to Hub via XCM, making any parachain token a potential gas token — with no code changes to the paymaster core.
3. **Polkadot Hub AA gap**: No production ERC-4337 infrastructure exists on Hub today. DotFuel fills this gap with a complete, auditable stack.

---

## 2) Goals / Non-Goals

### Goals (in-scope, required for hackathon)

1. ERC-4337 "account abstraction" UX on Polkadot Hub:
    - Smart account (contract wallet) with `executeBatch`
    - Factory with deterministic address (CREATE2)
2. **Single Paymaster contract** supporting two modes:
    - **MODE_SPONSOR**: sponsor pays gas for marketing/onboarding
    - **MODE_TOKEN_PERMIT2**: user pays gas in ERC-20, settled via Permit2 in `postOp`
3. Permit2 integration is **NOT optional**:
    - Deploy Permit2 to Polkadot Hub
    - Paymaster verifies Permit2 signature in validation
    - Paymaster collects token in postOp using Permit2 SignatureTransfer + Witness
4. Turnkey devops:
    - Bundler running against Polkadot Hub RPC (docker-compose)
    - Paymaster API for quotes / policies / Permit2 typed data
    - Bootstrap scripts to create/mint a test ERC-20 via Assets pallet and compute its ERC20 precompile address
5. Demo app + sponsor console:
    - End-to-end flow with hardcoded allowlists and short expirations for safety
    - Live on Polkadot Hub TestNet with recorded tx links

### Non-goals (explicitly out of scope for hackathon)

- Universal cross-parachain auto-sweeping ("any parachain token without bridging")
- Fully decentralized token pricing / oracle system
- Arbitrary-call paymaster (no open-ended sponsorship)
- Upgradeable proxies for core contracts (keep immutable for auditability)
- Multi-bundler redundancy / MEV protection

---

## 3) Target Networks (Polkadot Hub)

### Polkadot Hub TestNet (primary — demo target)

- Currency symbol: PAS
- Chain ID: `420420417`
- RPC URLs:
    - `https://eth-rpc-testnet.polkadot.io/`
    - `https://services.polkadothub-rpc.com/testnet/`
- Explorers:
    - `https://blockscout-testnet.polkadot.io/`
    - `https://polkadot.testnet.routescan.io/`
- WSS (for Assets pallet bootstrap):
    - `wss://asset-hub-paseo-rpc.n.dwellir.com`

### Polkadot Hub Mainnet (stretch — post-hackathon)

- Currency symbol: DOT
- Chain ID: `420420419`
- RPC URLs:
    - `https://eth-rpc.polkadot.io/`
- Explorer:
    - `https://blockscout.polkadot.io/`

---

## 4) Key Polkadot Hub Constraint: ERC20 Precompile Subset

Polkadot Hub maps Assets pallet assets to deterministic ERC20 precompile addresses. The precompile supports only the standard ERC20 transfer interface:

- `totalSupply()`, `balanceOf()`, `allowance()`, `approve()`, `transfer()`, `transferFrom()`

Notably **no** `name/symbol/decimals`. Therefore:

- DotFuel MUST maintain an on-chain **TokenRegistry** (decimals, symbol, risk params) populated by bootstrap scripts.
- The paymaster reads `decimals` from TokenRegistry instead of calling `token.decimals()`.

### ERC20 precompile address formula

```
address = 0x[assetId (8 hex)] + [24 zeros] + [prefix (8 hex)]
```

Example: Asset ID 1984 → `0x000007C000000000000000000000000001200000`

---

## 5) System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Polkadot Hub (EVM)                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │  EntryPoint  │◄───│          GasStationPaymaster          │   │
│  │  (ERC-4337)  │    │  MODE_SPONSOR | MODE_TOKEN_PERMIT2   │   │
│  └──────┬───────┘    └────────────┬────────────┬────────────┘   │
│         │                         │            │                  │
│  ┌──────▼───────┐    ┌────────────▼──┐  ┌─────▼──────────────┐ │
│  │ GasStation   │    │ TokenRegistry  │  │ CampaignRegistry   │ │
│  │ Account      │    │ (decimals +    │  │ (budgets +         │ │
│  │ (EIP-1271)   │    │  risk params)  │  │  allowlists +      │ │
│  └──────────────┘    └───────────────┘  │  quotas)           │ │
│                                          └────────────────────┘ │
│  ┌──────────────┐    ┌───────────────┐                          │
│  │ GasStation   │    │    Permit2    │  ┌────────────────────┐  │
│  │ Factory      │    │ (Uniswap, Hub │  │     DemoDapp       │  │
│  │ (CREATE2)    │    │  deployment)  │  │  (safe allowlist)  │  │
│  └──────────────┘    └───────────────┘  └────────────────────┘  │
│                                                                  │
│  Assets pallet ──ERC20 precompile──► any token address           │
└─────────────────────────────────────────────────────────────────┘

Off-chain:
  bundler (docker)  ◄──eth_sendUserOperation──  demo-web (Next.js)
  paymaster-api     ◄──POST /v1/quote/token───  demo-web
  bootstrap-assets  ──WSS──► Asset Hub (create + mint tUSDT)
```

### On-chain (Solidity / Foundry)

| Contract | Purpose |
|---|---|
| `EntryPoint` | ERC-4337 singleton (standard) |
| `GasStationAccount` | Smart account: EIP-1271, executeBatch |
| `GasStationFactory` | CREATE2 counterfactual deployment |
| `Permit2` | Uniswap Permit2 deployed to Hub |
| `GasStationPaymaster` | Dual-mode paymaster (sponsor + token) |
| `TokenRegistry` | Enabled tokens + decimals + risk params |
| `CampaignRegistry` | Sponsor campaigns, budget, allowlists |
| `DemoDapp` | Safe target contract for demo |

### Off-chain

| Service | Purpose |
|---|---|
| `bundler` | ERC-4337 bundler (docker, Hub RPC) |
| `paymaster-api` | Quote signing + Permit2 typed data + nonce allocator |
| `bootstrap-assets` | WSS: create asset → mint → register in TokenRegistry |

### Frontend

| App | Purpose |
|---|---|
| `demo-web` | Connect EOA → compute counterfactual → sign → send UserOp |
| `sponsor-console` | Create campaign → fund → view usage |

---

## 6) Contract Specs (Authoritative)

### 6.1 GasStationAccount.sol

#### Purpose

Minimal, auditable ERC-4337 smart account with EOA owner, EIP-1271 signature validation, and batch execution.

#### Storage

```solidity
address public owner;
IEntryPoint public immutable entryPoint;
```

#### Required functions

```solidity
function validateUserOp(
    UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 missingAccountFunds
) external returns (uint256 validationData);

function execute(address to, uint256 value, bytes calldata data) external;
function executeBatch(Call[] calldata calls) external;

// EIP-1271: returns 0x1626ba7e if signature matches owner
function isValidSignature(bytes32 hash, bytes calldata signature)
    external view returns (bytes4);
```

#### Call struct

```solidity
struct Call {
    address to;
    uint256 value;
    bytes data;
}
```

#### Security invariants

- Only EntryPoint can call `validateUserOp`.
- Only EntryPoint can call `execute/executeBatch` (owner-controlled emergency fallback acceptable for hackathon).

---

### 6.2 GasStationFactory.sol

#### Purpose

Deterministic account creation for counterfactual onboarding (receive tokens before deployment).

```solidity
// salt = keccak256(abi.encode(owner, userSalt))
function getAddress(address owner, uint256 userSalt) external view returns (address);
function createAccount(address owner, uint256 userSalt) external returns (GasStationAccount);
```

---

### 6.3 Permit2 (Uniswap, Hub deployment)

Standard Uniswap Permit2 deployed to Polkadot Hub.

- Users do a **one-time** `token.approve(permit2, type(uint256).max)`.
- This approval is bundled as the first call in the first UserOp (sponsored), enabling 0-PAS onboarding.
- Permit2 is **NOT** assumed to be at a canonical address — address is stored as an immutable in paymaster.

---

### 6.4 TokenRegistry.sol

```solidity
struct TokenConfig {
    bool     enabled;
    uint8    decimals;       // required: ERC20 precompile lacks decimals()
    uint16   markupBps;      // paymaster safety margin (e.g., 300 = 3%)
    uint256  minMaxCharge;   // min maxTokenCharge allowed in quote
    uint256  maxMaxCharge;   // max maxTokenCharge allowed in quote
}

mapping(address => TokenConfig) public tokenConfig;
address public admin;

function setToken(address token, TokenConfig calldata cfg) external;
function disableToken(address token) external;
function getToken(address token) external view returns (TokenConfig memory);
```

---

### 6.5 CampaignRegistry.sol

```solidity
struct Campaign {
    bool     enabled;
    uint48   start;
    uint48   end;
    uint256  budget;          // native token budget (tracked via EntryPoint deposit)
    uint256  spent;
    address[] allowedTargets;
    uint32   perUserMaxOps;
}

mapping(bytes32 => Campaign) public campaigns;
mapping(bytes32 => mapping(address => uint32)) public userOpsUsed;
address public admin;
```

---

### 6.6 GasStationPaymaster.sol (Single Paymaster, Two Modes)

#### Immutables

```solidity
IEntryPoint       public immutable entryPoint;
address           public immutable treasury;      // token settlement recipient
address           public immutable quoteSigner;   // paymaster API signer key
address           public immutable permit2;
TokenRegistry     public immutable tokenRegistry;
CampaignRegistry  public immutable campaignRegistry;
```

#### Mode constants

```solidity
uint8 constant MODE_SPONSOR       = 1;
uint8 constant MODE_TOKEN_PERMIT2 = 2;
```

#### `paymasterAndData` encoding (canonical)

```
paymasterAndData = abi.encodePacked(paymasterAddress, abi.encode(PaymasterData))
```

```solidity
struct PaymasterData {
    uint8   mode;
    uint48  validUntil;
    bytes   signature;           // quoteSigner ECDSA over EIP-712 hash

    // MODE_SPONSOR fields
    bytes32 campaignId;

    // MODE_TOKEN_PERMIT2 fields
    address token;
    uint256 maxTokenCharge;
    uint256 tokenPerNativeScaled; // token-smallest per native-smallest × 1e18
    uint256 permit2Nonce;
    uint256 permit2Deadline;
    bytes   permit2Signature;    // user EIP-712 signature consumed by Permit2 in postOp
}
```

Decode: `abi.decode(userOp.paymasterAndData[20:], (PaymasterData))`

#### Quote signature (EIP-712)

Domain:

```
name:              "GasStationPaymaster"
version:           "1"
chainId:           block.chainid
verifyingContract: address(this)
```

Type hashes:

```
TokenQuote(
    address sender,
    bytes32 callDataHash,
    address token,
    uint48  validUntil,
    uint256 maxTokenCharge,
    uint256 tokenPerNativeScaled,
    uint256 permit2Nonce,
    uint256 permit2Deadline
)

SponsorQuote(
    address sender,
    bytes32 callDataHash,
    bytes32 campaignId,
    uint48  validUntil
)
```

Binding rules:
- Always bind to `sender` (smart account) + `callDataHash` + `validUntil`.
- TokenQuote also binds token, maxTokenCharge, exchange rate, Permit2 nonce/deadline.

#### Permit2 witness (mandatory)

Witness struct:

```
GasStationWitness(
    address sender,
    bytes32 callDataHash,
    address token,
    uint256 maxTokenCharge,
    uint48  validUntil,
    address treasury
)
```

On-chain witness hash:

```solidity
bytes32 constant GAS_STATION_WITNESS_TYPEHASH = keccak256(
    "GasStationWitness(address sender,bytes32 callDataHash,"
    "address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
);

bytes32 witness = keccak256(abi.encode(
    GAS_STATION_WITNESS_TYPEHASH,
    sender, callDataHash, token, maxTokenCharge, validUntil, treasury
));
```

Witness type string for Permit2:

```solidity
string constant WITNESS_TYPESTRING =
    "GasStationWitness witness)"
    "GasStationWitness(address sender,bytes32 callDataHash,"
    "address token,uint256 maxTokenCharge,uint48 validUntil,address treasury)"
    "TokenPermissions(address token,uint256 amount)";
```

#### Paymaster validation flow (MODE_TOKEN_PERMIT2)

In `validatePaymasterUserOp`:

1. Decode `PaymasterData`
2. Reject if `block.timestamp > validUntil`
3. Verify `tokenRegistry.tokenConfig[token].enabled == true`
4. Compute `callDataHash = keccak256(userOp.callData)`
5. Verify paymaster quote signature (EIP-712 TokenQuote)
6. Compute Permit2 witness hash
7. Derive Permit2 digest and verify against sender (EIP-1271):

```solidity
bytes32 TOKEN_PERMISSIONS_TYPEHASH =
    keccak256("TokenPermissions(address token,uint256 amount)");

string constant PERMIT_WITNESS_STUB =
    "PermitWitnessTransferFrom(TokenPermissions permitted,"
    "address spender,uint256 nonce,uint256 deadline,";

bytes32 typeHash = keccak256(abi.encodePacked(PERMIT_WITNESS_STUB, WITNESS_TYPESTRING));
bytes32 tokenPermissionsHash = keccak256(abi.encode(TOKEN_PERMISSIONS_TYPEHASH, token, maxTokenCharge));

bytes32 dataHash = keccak256(abi.encode(
    typeHash,
    tokenPermissionsHash,
    address(this),   // spender = paymaster (caller of Permit2 in postOp)
    permit2Nonce,
    permit2Deadline,
    witness
));

bytes32 digest = keccak256(abi.encodePacked(
    "\x19\x01",
    IPermit2(permit2).DOMAIN_SEPARATOR(),
    dataHash
));

require(
    SignatureChecker.isValidSignatureNow(sender, digest, permit2Signature),
    "invalid permit2 sig"
);
```

Additional safety checks (required):

- `userOp.callData.length <= MAX_CALLDATA_BYTES`
- Decode `executeBatch(Call[])` and enforce every `Call.to` is allowlisted
- No direct calls to payment token contract except `approve(permit2, max)` when allowance is zero

Return:
- `context`: all token settlement params (token, maxTokenCharge, tokenPerNativeScaled, permit2Nonce, permit2Deadline, permit2Signature, sender, callDataHash, validUntil)
- `validationData`: encodes `validUntil` as deadline

#### Paymaster postOp flow (MODE_TOKEN_PERMIT2)

```solidity
// Gas cost → token amount
uint256 raw    = (actualGasCost * tokenPerNativeScaled) / 1e18;
uint16  markup = tokenRegistry.tokenConfig(token).markupBps;
uint256 charge = raw + (raw * markup) / 10_000;
if (charge > maxTokenCharge) charge = maxTokenCharge;

// Collect via Permit2
IPermit2(permit2).permitWitnessTransferFrom(
    PermitTransferFrom({
        permitted: TokenPermissions({ token: token, amount: maxTokenCharge }),
        nonce:     permit2Nonce,
        deadline:  permit2Deadline
    }),
    SignatureTransferDetails({ to: treasury, requestedAmount: charge }),
    sender,
    witness,
    WITNESS_TYPESTRING,
    permit2Signature
);

emit TokenGasPaid(sender, token, charge, actualGasCost);
```

Hard requirement: Permit2 spending MUST only happen inside `postOp` called by EntryPoint. No external callable path.

#### Sponsor mode (MODE_SPONSOR)

- Verify quote signature over `SponsorQuote`
- Check campaign: time window, target allowlist, per-user quota
- No token settlement in `postOp`
- Emit `Sponsored(sender, campaignId, actualGasCost)`

---

## 7) Off-chain API Specs (Paymaster API)

### 7.1 Environment Variables

```
RPC_URL_TESTNET
CHAIN_ID
PAYMASTER_ADDRESS
PERMIT2_ADDRESS
QUOTE_SIGNER_PRIVATE_KEY
TOKEN_REGISTRY_ADDRESS
CAMPAIGN_REGISTRY_ADDRESS
ENTRYPOINT_ADDRESS
TREASURY_ADDRESS
```

### 7.2 Endpoints

#### `POST /v1/quote/token`

Returns `PaymasterData` (without permit2Signature) + Permit2 typed data for client signing.

Request:
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

Response:
```json
{
  "mode": 2,
  "validUntil": 1760000000,
  "token": "0x...",
  "maxTokenCharge": "123456789",
  "tokenPerNativeScaled": "7000000000000000000",
  "permit2Nonce": "0x...",
  "permit2Deadline": 1760000000,
  "callDataHash": "0x...",
  "witness": "0x...",
  "permit2TypedData": { "...": "..." },
  "paymasterSignature": "0x...",
  "paymasterAndDataNoPermitSig": "0x..."
}
```

Client flow: sign `permit2TypedData` → insert signature → build UserOp → sign → send to bundler.

#### `POST /v1/quote/sponsor`

Request:
```json
{
  "chainId": 420420417,
  "sender": "0x...",
  "callData": "0x...",
  "initCode": "0x...",
  "campaignId": "0x..."
}
```

Response:
```json
{
  "mode": 1,
  "validUntil": 1760000000,
  "campaignId": "0x...",
  "callDataHash": "0x...",
  "paymasterSignature": "0x...",
  "paymasterAndData": "0x..."
}
```

#### Sponsor Admin

- `POST /v1/campaign/create`
- `POST /v1/campaign/fund`
- `POST /v1/campaign/allowlist`
- `GET  /v1/campaign/:id/status`

---

## 8) Bundler Requirements

- Supports `eth_sendUserOperation` and `eth_estimateUserOperationGas`
- Configurable to Polkadot Hub TestNet RPC
- Runs in `docker-compose`

Acceptance: 3 UserOps mined in each mode, visible in Blockscout.

---

## 9) Assets Bootstrap (Mandatory for TestNet Reliability)

Bootstrap script (`scripts/bootstrap-assets.ts`) must:

1. Connect to WSS
2. Create a new asset via Assets pallet
3. Set metadata (name: "Test USDT", symbol: "tUSDT", decimals: 6)
4. Mint to test EOAs + counterfactual smart account addresses
5. Compute ERC20 precompile address from assetId
6. Register token in TokenRegistry with decimals and safety params

Outputs: assetId, precompile address, mint tx hashes, registry tx hash.

---

## 10) Demo UX Flows (Scripted for Demo Day)

### Flow A — Token Mode (Permit2 Settlement) ⭐ Primary Demo

**Setup**: Wallet has 0 PAS. Smart account has tUSDT (pre-minted by bootstrap).

| Step | Actor | Action |
|---|---|---|
| 1 | User | Connect EOA to demo-web |
| 2 | App | Display counterfactual smart account address |
| 3 | User | Click "Pay gas in tUSDT" |
| 4 | App | Call `/v1/quote/token` → receive Permit2 typed data |
| 5 | User | Sign Permit2 typed data with EOA |
| 6 | App | Build UserOp → sign UserOp → send to bundler |
| 7 | Chain | Deploy account + approve Permit2 + execute DemoDapp call + postOp collects tUSDT |
| 8 | UI | Show: gas paid (PAS) + tUSDT charged + Blockscout link |

### Flow B — Sponsor Mode

**Setup**: Campaign exists and funded.

| Step | Actor | Action |
|---|---|---|
| 1 | User | Click "Execute Sponsored" |
| 2 | App | Call `/v1/quote/sponsor` → receive paymasterAndData |
| 3 | App | Build + sign UserOp → send to bundler |
| 4 | Chain | Mined; no token settlement; quota consumed |
| 5 | UI | Show: fully sponsored + Blockscout link |

### Flow C — Sponsor Console (Judge Demo)

- Create campaign with budget
- Set target allowlist
- Watch quota consumed in real time as Flow B ops are submitted

---

## 11) Repository Layout

```
dotfuel/
  PROJECT.md
  HACKATHON.md
  README.md
  contracts/                  # Foundry
    src/
      GasStationAccount.sol
      GasStationFactory.sol
      GasStationPaymaster.sol
      TokenRegistry.sol
      CampaignRegistry.sol
      DemoDapp.sol
      interfaces/
        IEntryPoint.sol
        IPermit2.sol
      vendor/permit2/          # vendored Uniswap Permit2
    test/
      GasStationAccount.t.sol
      GasStationPaymaster.t.sol
      Permit2Digest.t.sol      # digest matches off-chain typed data
      PostOpSettlement.t.sol
    script/
      Deploy.s.sol
  apps/
    demo-web/                  # Next.js + viem
    paymaster-api/             # Node/TS (Express or Hono)
  packages/
    shared/                    # ABI, types, Permit2 typed-data helpers
  scripts/
    bootstrap-assets.ts        # WSS Assets pallet bootstrap
    compute-precompile-address.ts
  docker/
    docker-compose.yml         # bundler + paymaster-api
  TICKET.md
  PROMPTS.md
```

---

## 12) Tooling / Build Constraints

### Solidity / Foundry

- Foundry nightly (required for Polkadot Hub compatibility)
- Solidity `^0.8.17` (compatible with Permit2)
- Forge tests must pass: `forge test -vvv`

### Node

- Node `>= 22.5`
- Package manager: `pnpm` (monorepo workspaces)

### Docker

- `docker-compose up` must start bundler + paymaster-api
- No external DB required for hackathon (in-memory nonce tracking is acceptable)

---

## 13) Security Requirements

### Determinism (validation must be deterministic)

- No external HTTP calls in validation
- No on-chain oracle dependencies
- Only EIP-712 signature verification + allowlist checks + arithmetic

### Replay / Theft Protection

- Permit2 `nonce + deadline`: mandatory
- `spender` binding: inherent (paymaster address)
- `witness` binding: mandatory (sender + callDataHash + limits + treasury)
- Quote signature: short `validUntil` (5 minutes recommended)

### Allowlist (hard requirement)

- Both modes: only allow calls to `DemoDapp` (+ `token.approve(permit2)` exception)
- Decode `executeBatch(Call[])` on-chain; enforce every `Call.to` is allowlisted

### PostOp Robustness

- `postOp` has no external callable path for token draining
- Permit2 call failure: fail loudly (do not silently lose gas; documented behavior)
- Validation strict enough that postOp failure is practically unreachable

---

## 14) Acceptance Criteria

### On-chain

- [ ] Deploy EntryPoint, Permit2, Factory, Paymaster, Registries, DemoDapp to Hub TestNet
- [ ] Verify contracts on Blockscout (if ABI upload supported)
- [ ] Unit tests:
    - [ ] Account signature validation (EIP-1271)
    - [ ] Paymaster quote signature verification
    - [ ] Permit2 digest calculation matches off-chain typed data
    - [ ] postOp settlement end-to-end
- [ ] Integration on testnet:
    - [ ] 3 token-mode ops mined and visible in explorer
    - [ ] 3 sponsor-mode ops mined and visible in explorer
    - [ ] Invalid Permit2 signature rejected in validation

### Off-chain

- [ ] Bundler running and accepting UserOps
- [ ] Paymaster API returns quote + typed data
- [ ] `bootstrap-assets` script produces usable ERC20 precompile token + mints it

### Frontend

- [ ] 0-PAS user executes DemoDapp call in token mode
- [ ] Sponsor mode works with quota and budget enforcement
- [ ] Explorer links shown post-execution

---

## 15) Milestone Plan (17 days to March 20)

| Day | Milestone |
|---|---|
| Day 1–2 | M0: Repo skeleton, Foundry setup, interfaces, Permit2 vendored |
| Day 3–4 | M1: GasStationAccount + Factory (unit tests pass) |
| Day 5 | M1.5: TokenRegistry + CampaignRegistry + DemoDapp |
| Day 6–8 | M2: GasStationPaymaster (both modes, full unit tests) |
| Day 9–10 | M3: Paymaster API (quote endpoints + EIP-712 signing) |
| Day 11 | M3.5: Bundler docker-compose + Assets bootstrap script |
| Day 12–14 | M4: demo-web (full UserOp flow, both modes) |
| Day 15 | M4.5: Deploy to TestNet + record 6 demo txs |
| Day 16 | M5: Sponsor console + polish |
| Day 17 | M6: README polish, submission, demo recording |

---

## 16) Reference Links

- Polkadot Hub network details: https://docs.polkadot.com/smart-contracts/connect/
- ERC20 precompile: https://docs.polkadot.com/smart-contracts/precompiles/erc20/
- XCM precompile: https://docs.polkadot.com/smart-contracts/precompiles/xcm/
- Permit2 overview: https://docs.uniswap.org/contracts/permit2/overview
- Permit2 SignatureTransfer: https://docs.uniswap.org/contracts/permit2/reference/signature-transfer
- Permit2 source — SignatureTransfer.sol: https://raw.githubusercontent.com/Uniswap/permit2/main/src/SignatureTransfer.sol
- Permit2 source — PermitHash.sol: https://raw.githubusercontent.com/Uniswap/permit2/main/src/libraries/PermitHash.sol
- Permit2 source — EIP712.sol: https://raw.githubusercontent.com/Uniswap/permit2/main/src/EIP712.sol

---

## 17) Implementation Notes (Explicit Decisions)

- Permit2 is deployed on Hub; do NOT assume canonical address — always use immutable.
- First UserOp in token-mode includes `token.approve(permit2, type(uint256).max)` inside `executeBatch` when allowance is zero.
- Paymaster sponsors gas; settlement succeeds in `postOp`.
- Permit2 signature validated during paymaster validation via computed digest + EIP-1271.
- Exchange rate: centralized signed quote with short expiry + markup bps; no oracle.
- `tokenPerNativeScaled` is in token-smallest-units per native-smallest-unit, scaled by 1e18 to avoid floating point.
- rounding direction: always round `charge` UP to protect paymaster (use ceiling division for `raw`).

---

## 18) Deliverables Summary (What "Done" Means)

A single repository that a judge can clone and:

1. Run `scripts/bootstrap-assets.ts` → get a live tUSDT token on Hub TestNet
2. Run `forge script Deploy.s.sol` → deploy all contracts
3. Run `docker-compose up` → start bundler + paymaster-api
4. Open `demo-web` → execute both flows
5. See mined transactions with explorer links in README

Pre-recorded demo video (2–3 min) showing both flows with 0 PAS wallet.
