# Privacy-Preserving Digital ID System for Bangladesh NID

**Author:** Md. Tanvir Islam  
**Supervisor:** Prof. Muradul Bashir  
**Project Scope:** Final-Year Thesis Proof of Concept (PoC)

---

## 🎯 Executive Summary & Academic Objectives

This project implements an end-to-end, privacy-preserving Self-Sovereign Identity (SSI) framework designed for the Bangladesh National ID (NID) system. It directly addresses and solves the four critical academic concerns raised by Prof. Muradul Bashir:

1. **Linkability & Brute-Force Immunity:** Eliminates plain deterministic hashing (`SHA256(NID)`) in favor of **Salted HMAC Commitments** ($C_i = \text{HMAC}(S_i, A_i)$) and **Verifier Session Blinding Nonces**, guaranteeing zero cross-service linkability.
2. **Decentralized Public Key Infrastructure (DPKI):** Smart contract (`NIDRegistry.sol`) serves as the immutable on-chain Trust Anchor hosting the Government Issuer's canonical public key.
3. **Privacy-Preserving Revocation:** Uses an on-chain Root Identity Commitment hash status registry to invalidate credentials (e.g. deceased, revoked, modified NIDs) without exposing citizen PII to the blockchain.
4. **Edge-Device Key Recovery (Social Recovery):** Implements a 2-of-3 guardian consensus mechanism on-chain, enabling citizens to securely rotate compromised/lost device keys to a new wallet without centralized recovery backdoors.

---

## 🏗️ Architecture & Project Structure

```text
bangladesh-nid-ssi/
├── contracts/
│   └── NIDRegistry.sol              # Solidity Smart Contract (DPKI, Revocation, Social Recovery)
├── scripts/
│   ├── 01_crypto_engine.js          # Standalone Cryptographic Proof & Unlinkability Engine
│   └── 02_deploy_and_benchmark.js   # Hardhat Deployment, Recovery Simulation & Benchmarking
├── hardhat.config.js                # Hardhat Local Network Configuration
├── package.json                     # Project Dependencies & Scripts
└── README.md                        # Implementation & Supervisor Defense Guide
```

---

## 🚀 Execution Instructions

### Prerequisites
- Node.js (v18+ or v24+)
- npm / npx

### Setup & Run
```bash
# Navigate to project directory
cd bangladesh-nid-ssi

# Install dependencies
npm install

# 1. Run Cryptographic Engine & Unlinkability Audit
npm run test:crypto

# 2. Run Hardhat Deployment, Revocation & Guardian Recovery Benchmark
npm run test:benchmark

# Or run both in sequence
npm run test:all
```

---

## 🎓 Supervisor Defense Guide (Prof. Muradul Bashir Defense Cheat-Sheet)

### 1. Linkability & Brute-Force Risk (Point #1)
- **Critique:** A plain hash of an NID (e.g., `SHA256("19980612345678901")`) produces a fixed output `0xa1b2...`. If presented to both a Bank and a Hospital, colluding parties can match `0xa1b2...` and track the citizen across services. Furthermore, because NIDs are 10 or 17 digits, an attacker can pre-calculate rainbow tables to reverse the NID.
- **Our Technical Solution:**
  - **Salted HMAC Commitments:** Every attribute is salted with a unique 256-bit random string ($S_i$). The search space increases to $2^{256}$ (~$1.15 \times 10^{77}$), rendering dictionary and brute-force attacks mathematically impossible.
  - **Verifier Session Blinding:** The edge wallet computes a presentation token $T_V = \text{HMAC}(N_V, R \parallel \text{VerifierID})$ using a fresh verifier challenge $N_V$. Presentation A (Bank) and Presentation B (Hospital) share zero cryptographic digests or tokens, preventing cross-service correlation even if both verifiers exchange raw presentation data.

### 2. Blockchain as a Trust Anchor (DPKI) (Point #2)
- **Critique:** How do relying parties verify credentials without relying on an online central government server that could track verification calls or go offline?
- **Our Technical Solution:**
  - The smart contract (`NIDRegistry.sol`) acts as a **Decentralized Public Key Infrastructure (DPKI)**.
  - The Government Issuer registers its authentic public signing key (`issuerPublicKey`) on the immutable blockchain ledger upon deployment.
  - Verifiers fetch the Issuer's public key from the smart contract once and verify credential signatures locally/offline. No runtime server requests are made to government infrastructure.

### 3. Revocation Without Privacy Leakage (Point #3)
- **Critique:** How do you invalidate modified, canceled, or deceased citizens' credentials on-chain without revealing sensitive citizen data to public blockchain nodes?
- **Our Technical Solution:**
  - The Issuer anchors only the **Root Identity Commitment Hash** ($R = \text{MerkleRoot}([C_1, \dots, C_n])$) on-chain via `registerCredential(bytes32)`.
  - When a credential must be revoked, the Issuer calls `revokeCredential(bytes32)`.
  - Relying parties check `isCredentialValid(bytes32)` on-chain using the Merkle Root $R$. Since $R$ is a one-way cryptographic hash of salted commitments, zero Personally Identifiable Information (PII) is stored or exposed on-chain.

### 4. Edge-Device Key Loss & Social Recovery (Point #4)
- **Critique:** Self-Sovereign Identity places private keys on the citizen's phone. If the phone is lost, stolen, or reset, how does the citizen avoid permanent identity loss without introducing a centralized backdoor?
- **Our Technical Solution:**
  - The smart contract implements **Guardian Social Recovery** (`registerGuardians`, `initiateRecovery`, `supportRecovery`).
  - Citizens register 3 trusted guardian wallet addresses (e.g., family members, government kiosks, or trusted entities).
  - When a phone is lost, the citizen requests guardians to vote on-chain for a new public key (`proposedNewKey`).
  - Upon reaching a **2-of-3 guardian consensus**, the smart contract automatically rotates `citizenActiveKey[citizen]` to the new key, emitting a `RecoveryExecuted` event. The identity is restored securely without any centralized master private key.
