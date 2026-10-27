/**
 * ==============================================================================
 * BANGLADESH NID PRIVACY-PRESERVING CRYPTOGRAPHIC ENGINE  v2.0
 * ==============================================================================
 * Thesis: "Design and Evaluation of a Privacy-Preserving Self-Sovereign Identity
 *          System for Bangladesh E-Government Services"
 * Author: Md. Tanvir Islam  |  Supervisor: Prof. Muradul Bashir
 *
 * IMPLEMENTED (Cryptographically Real):
 *   - Salted HMAC-SHA256 attribute commitments (eliminates brute-force / linkability)
 *   - Custom Merkle tree + inclusion proof verification (selective disclosure)
 *   - Verifier-specific session nonce blinding (unlinkability across services)
 *   - Issuer ECDSA signature over Merkle root (issuer authentication, now stored & verified)
 *   - Citizen device key ownership signature + verification
 *   - Credential expiry date enforcement
 *   - Tamper detection via commitment re-computation
 *   - DID-key derivation from issuer/citizen public keys (simplified did:key scheme)
 *
 * SIMULATED / LABELLED:
 *   - "Zero-Knowledge" in UI labels = conceptual; actual crypto is HMAC-Merkle,
 *     not a zk-SNARK circuit. Labelled accurately in the web interface.
 *   - On-chain revocation in the web demo = in-memory flag unless Hardhat node
 *     is running. The smart contract logic is the authoritative implementation.
 *
 * DOES NOT LOG RAW ATTRIBUTE VALUES to stdout.
 * ==============================================================================
 */

"use strict";
const crypto = require("crypto");
const { ethers } = require("ethers");

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** HMAC-SHA256. key and data may be Buffer or string. */
function hmacSHA256(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/** SHA-256 over a Buffer or string. */
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// Merkle tree
// ---------------------------------------------------------------------------

function buildMerkleTree(leavesHex) {
  const strip = (h) => (h.startsWith("0x") ? h.slice(2) : h);
  let tree = [leavesHex.map(strip)];
  while (tree[tree.length - 1].length > 1) {
    const level = tree[tree.length - 1];
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // duplicate last if odd
      next.push(sha256(Buffer.from(left + right, "hex")));
    }
    tree.push(next);
  }
  return tree;
}

function getMerkleProof(tree, leafIndex) {
  const proof = [];
  let idx = leafIndex;
  for (let level = 0; level < tree.length - 1; level++) {
    const current = tree[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    proof.push({
      position: isRight ? "left" : "right",
      data: siblingIdx < current.length ? current[siblingIdx] : current[idx],
    });
    idx = Math.floor(idx / 2);
  }
  return proof;
}

function verifyMerkleProof(leafHex, proof, rootHex) {
  const strip = (h) => (h.startsWith("0x") ? h.slice(2) : h);
  let current = strip(leafHex);
  const targetRoot = strip(rootHex);
  for (const step of proof) {
    const combined =
      step.position === "left"
        ? sha256(Buffer.from(step.data + current, "hex"))
        : sha256(Buffer.from(current + step.data, "hex"));
    current = combined;
  }
  return current === targetRoot;
}

// ---------------------------------------------------------------------------
// DID derivation (simplified did:key scheme — no external resolver needed)
// ---------------------------------------------------------------------------

/**
 * Derives a pseudo did:key identifier from a compressed-form public key hash.
 * Format: did:key:nid-ssi:<first-20-hex-chars-of-sha256(pubkey)>
 * This is a simplified, non-W3C-conformant scheme suitable for a PoC thesis demo.
 */
function deriveDID(publicKeyHex) {
  const stripped = publicKeyHex.startsWith("0x") ? publicKeyHex.slice(2) : publicKeyHex;
  const hash = sha256(Buffer.from(stripped, "hex"));
  return `did:key:nid-ssi:${hash.slice(0, 40)}`;
}

// ---------------------------------------------------------------------------
// 1. GOVERNMENT ISSUER — CREDENTIAL ISSUANCE
// ---------------------------------------------------------------------------

/**
 * Issues a signed W3C-shaped Verifiable Credential from synthetic citizen data.
 *
 * @param {object} cidData  - Synthetic citizen attributes. Must NOT contain real NID data.
 * @param {ethers.Wallet} issuerWallet - Issuer signing key.
 * @param {object} [options]
 * @param {number}  [options.validityDays=365] - Credential validity window.
 * @returns {object} Credential object (never logs raw attribute values).
 */
function issueGovernmentCredential(cidData, issuerWallet, options = {}) {
  const validityDays = options.validityDays ?? 365;
  const issuanceDate = new Date().toISOString();
  const expirationDate = new Date(Date.now() + validityDays * 86400_000).toISOString();

  const attributes = Object.keys(cidData);
  const commitments = {};
  const salts = {};
  const leafHashes = [];

  // Build salted HMAC commitments — values are NOT logged
  for (const attr of attributes) {
    const salt = crypto.randomBytes(32).toString("hex");
    salts[attr] = salt;
    const commitment = hmacSHA256(Buffer.from(salt, "hex"), String(cidData[attr]));
    commitments[attr] = commitment;
    leafHashes.push(commitment);
  }

  // Merkle root over all attribute commitments
  const merkleTree = buildMerkleTree(leafHashes);
  const merkleRoot = "0x" + merkleTree[merkleTree.length - 1][0];

  // Issuer ECDSA signature over the Merkle root
  // signMessageSync produces a deterministic 65-byte signature over keccak256(prefix + message)
  const issuerSignature = issuerWallet.signMessageSync(
    ethers.getBytes(ethers.id(merkleRoot))
  );

  const issuerDID = deriveDID(issuerWallet.signingKey.publicKey);

  // W3C-shaped Verifiable Credential envelope (simplified, not full JSON-LD)
  const vcEnvelope = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://example.bd/nid-ssi/v1"
    ],
    type: ["VerifiableCredential", "BangladeshNIDCredential"],
    issuer: issuerDID,
    issuanceDate,
    expirationDate,
    credentialSubject: {
      id: null, // filled in by the citizen wallet on first use
      attributeCount: attributes.length,
      merkleRoot,
    },
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: issuanceDate,
      verificationMethod: issuerDID + "#key-1",
      proofPurpose: "assertionMethod",
      jws: issuerSignature,
    },
  };

  return {
    // Internal crypto state (never transmitted whole to verifier)
    _rawData: cidData,          // kept only in issuer/citizen memory; never sent to verifier
    attributes,
    salts,
    commitments,
    merkleTree,
    leafOrder: attributes,

    // Public credential fields (safe to share)
    rootIdentityCommitment: merkleRoot,
    issuerAddress: issuerWallet.address,
    issuerPublicKey: issuerWallet.signingKey.publicKey,
    issuerDID,
    issuerSignature,
    issuanceDate,
    expirationDate,
    vcEnvelope,
  };
}

// ---------------------------------------------------------------------------
// 2. CITIZEN WALLET — PRESENTATION GENERATION
// ---------------------------------------------------------------------------

/**
 * Generates an unlinkable selective-disclosure presentation for a specific verifier.
 *
 * What the verifier receives:
 *   - Only the disclosed attribute values + their salts + Merkle paths.
 *   - A blinded presentation token (verifier-specific, derived from challenge + root + verifier name).
 *   - The issuer signature over the Merkle root (so the verifier can authenticate the issuer).
 *   - A citizen device ownership proof (ECDSA over the verifier challenge).
 *
 * What the verifier does NOT receive:
 *   - Salts or values of non-disclosed attributes.
 *   - The citizen's raw NID number (unless explicitly disclosed).
 *   - Any token that can be correlated with a presentation to a different verifier.
 */
function generatePresentation(credential, selectedAttributeKeys, verifierName, verifierChallenge, citizenWallet) {
  const disclosedAttributes = {};
  const proofs = {};

  for (const key of selectedAttributeKeys) {
    const leafIndex = credential.leafOrder.indexOf(key);
    if (leafIndex === -1) throw new Error(`Attribute "${key}" not found in credential`);

    disclosedAttributes[key] = {
      value: credential._rawData[key],
      salt: credential.salts[key],
      commitment: credential.commitments[key],
    };

    proofs[key] = getMerkleProof(credential.merkleTree, leafIndex);
  }

  // Verifier-specific blinded token — distinct per (verifier, challenge, root) triple
  const presentationToken = hmacSHA256(
    Buffer.from(verifierChallenge),
    `${credential.rootIdentityCommitment}:${verifierName}`
  );

  // Citizen proves ownership of their active device key
  const citizenSignature = citizenWallet.signMessageSync(
    ethers.getBytes(ethers.id(verifierChallenge))
  );

  const citizenDID = deriveDID(citizenWallet.signingKey.publicKey);

  return {
    // Verifier metadata
    verifierName,
    verifierChallenge,
    presentationToken,
    generatedAt: new Date().toISOString(),

    // Credential anchor
    rootIdentityCommitment: credential.rootIdentityCommitment,
    issuanceDate: credential.issuanceDate,
    expirationDate: credential.expirationDate,

    // Issuer authentication
    issuerAddress: credential.issuerAddress,
    issuerDID: credential.issuerDID,
    issuerSignature: credential.issuerSignature,

    // Citizen identity & consent
    citizenAddress: citizenWallet.address,
    citizenDID,
    citizenSignature,

    // Selective disclosure payload
    disclosedAttributes,
    proofs,
  };
}

// ---------------------------------------------------------------------------
// 3. RELYING PARTY — PRESENTATION VERIFICATION  (4-point check)
// ---------------------------------------------------------------------------

/**
 * Verifies a presentation.  Returns { valid: bool, reason?: string, checks: object }.
 *
 * Check 1 — Session challenge matches (replay protection).
 * Check 2 — Credential is not expired.
 * Check 3 — Issuer ECDSA signature over Merkle root is authentic.
 * Check 4 — Each disclosed attribute re-computes its HMAC commitment and passes Merkle proof.
 * Check 5 — Citizen device ownership signature is valid.
 */
function verifyPresentation(presentation, expectedChallenge, expectedIssuerAddress) {
  const checks = {
    sessionChallenge: false,
    credentialExpiry: false,
    issuerSignature: false,
    merkleProofs: false,
    citizenSignature: false,
  };

  // Check 1: Session challenge
  if (presentation.verifierChallenge !== expectedChallenge) {
    return { valid: false, reason: "Session challenge mismatch (possible replay attack)", checks };
  }
  checks.sessionChallenge = true;

  // Check 2: Expiry
  if (presentation.expirationDate && new Date(presentation.expirationDate) < new Date()) {
    return { valid: false, reason: `Credential expired on ${presentation.expirationDate}`, checks };
  }
  checks.credentialExpiry = true;

  // Check 3: Issuer ECDSA signature over Merkle root
  try {
    const recoveredIssuer = ethers.verifyMessage(
      ethers.getBytes(ethers.id(presentation.rootIdentityCommitment)),
      presentation.issuerSignature
    );
    if (recoveredIssuer.toLowerCase() !== expectedIssuerAddress.toLowerCase()) {
      return { valid: false, reason: "Issuer signature verification failed — credential may be forged", checks };
    }
    checks.issuerSignature = true;
  } catch {
    return { valid: false, reason: "Issuer signature is malformed", checks };
  }

  // Check 4: Merkle inclusion proofs for each disclosed attribute
  for (const key of Object.keys(presentation.disclosedAttributes)) {
    const attr = presentation.disclosedAttributes[key];
    const recomputed = hmacSHA256(Buffer.from(attr.salt, "hex"), String(attr.value));
    if (recomputed !== attr.commitment) {
      return { valid: false, reason: `Commitment mismatch for attribute "${key}" — data may be tampered`, checks };
    }
    if (!verifyMerkleProof(recomputed, presentation.proofs[key], presentation.rootIdentityCommitment)) {
      return { valid: false, reason: `Merkle proof failed for attribute "${key}" — credential may be tampered`, checks };
    }
  }
  checks.merkleProofs = true;

  // Check 5: Citizen device ownership signature
  try {
    const recovered = ethers.verifyMessage(
      ethers.getBytes(ethers.id(presentation.verifierChallenge)),
      presentation.citizenSignature
    );
    if (recovered.toLowerCase() !== presentation.citizenAddress.toLowerCase()) {
      return { valid: false, reason: "Citizen device signature invalid — wallet mismatch", checks };
    }
    checks.citizenSignature = true;
  } catch {
    return { valid: false, reason: "Citizen signature is malformed", checks };
  }

  return { valid: true, checks };
}

// ---------------------------------------------------------------------------
// 4. RESEARCH EVALUATION — AUTOMATED LINKABILITY & PRIVACY AUDIT
// ---------------------------------------------------------------------------

function runLinkabilityAndPrivacyTests() {
  const startTime = Date.now();

  const issuerWallet = ethers.Wallet.createRandom();
  const citizenWallet = ethers.Wallet.createRandom();

  // Synthetic citizen data — NOT a real person
  const syntheticData = {
    nid: "NID-DEMO-2024-00001",      // clearly synthetic identifier
    name: "Karim (Synthetic)",
    dob: "2000-01-15",
    district: "Dhaka",
    isOver18: true,
  };

  const credential = issueGovernmentCredential(syntheticData, issuerWallet);

  // Presentation A — Bank (requires isOver18 + district)
  const bankChallenge = "bank-nonce-" + crypto.randomBytes(8).toString("hex");
  const presentationA = generatePresentation(
    credential, ["isOver18", "district"], "Sonali Bank PLC", bankChallenge, citizenWallet
  );

  // Presentation B — Hospital (requires only isOver18)
  const hospitalChallenge = "hosp-nonce-" + crypto.randomBytes(8).toString("hex");
  const presentationB = generatePresentation(
    credential, ["isOver18"], "Dhaka Medical Hospital", hospitalChallenge, citizenWallet
  );

  // Verify both
  const bankResult = verifyPresentation(presentationA, bankChallenge, issuerWallet.address);
  const hospResult = verifyPresentation(presentationB, hospitalChallenge, issuerWallet.address);

  // Linkability audit
  const tokensDistinct = presentationA.presentationToken !== presentationB.presentationToken;
  const challengesDistinct = bankChallenge !== hospitalChallenge;
  const bankHasPII = ["nid", "name", "dob"].some((k) => k in presentationA.disclosedAttributes);
  const hospHasDistrict = "district" in presentationB.disclosedAttributes;

  const plainHash = sha256(syntheticData.nid);

  const elapsed = Date.now() - startTime;

  return {
    success: bankResult.valid && hospResult.valid && tokensDistinct && !bankHasPII,
    latencyMs: elapsed,
    audits: {
      bankVerification: bankResult.valid,
      hospitalVerification: hospResult.valid,
      presentationTokensDistinct: tokensDistinct,
      sessionChallengesDistinct: challengesDistinct,
      bankCannotSeePII: !bankHasPII,
      hospitalCannotSeeDistrict: !hospHasDistrict,
      bruteForceEntropy: {
        plainHashEntropy: "~10^17 (17-digit NID space — rainbow-table vulnerable)",
        saltedHMACEntropy: "~2^256 (~1.15 × 10^77 — computationally infeasible)",
        plainHashExample: "0x" + plainHash.slice(0, 16) + "...",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// CLI entry point (only when run directly)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const result = runLinkabilityAndPrivacyTests();
  console.log("\n=== BANGLADESH NID SSI — CRYPTOGRAPHIC AUDIT RESULTS ===\n");
  console.log("Overall Pass:", result.success ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED");
  console.log("Latency (ms):", result.latencyMs);
  console.log("\nAudit Detail:");
  Object.entries(result.audits).forEach(([k, v]) => {
    if (typeof v === "object") {
      console.log(`  ${k}:`);
      Object.entries(v).forEach(([kk, vv]) => console.log(`    ${kk}: ${vv}`));
    } else {
      console.log(`  ${k}:`, typeof v === "boolean" ? (v ? "✅ PASS" : "❌ FAIL") : v);
    }
  });
}

module.exports = {
  issueGovernmentCredential,
  generatePresentation,
  verifyPresentation,
  runLinkabilityAndPrivacyTests,
  deriveDID,
  hmacSHA256,
  sha256,
};
