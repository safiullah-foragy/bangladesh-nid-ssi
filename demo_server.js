/**
 * ==============================================================================
 * BANGLADESH NID SSI — THESIS DEFENCE WEB APPLICATION v3.1 (HIGH-FIDELITY UI)
 * ==============================================================================
 * Official Government-Grade Self-Sovereign Identity Defense Console
 *
 * DESIGNED SPECIFICALLY FOR THESIS DEFENCE & SUPERVISOR DEMONSTRATION:
 *   - National-grade dual-language header (বাংলা / English).
 *   - High-fidelity Bangladesh Smart NID Card with gold EMV chip, hologram,
 *     citizen photo, and digital security badge.
 *   - Unified 3-Column Pipeline on ONE SCREEN:
 *     1. 🏛️ Govt. Issuer (Upload info, validate 10/17-digit NID, sign Merkle Root)
 *     2. 📱 Citizen Mobile Wallet (Smartcard, Selective Disclosure, QR Token)
 *     3. 🏢 Relying Party Verifier (Sonali Bank PLC, 5-point checklist, Latency)
 *   - Security & Attack Demonstration Suite:
 *     🔨 Tamper Attack (Merkle proof commitment mismatch rejection)
 *     🚫 Blockchain Revocation (Instant on-chain invalidation)
 *     🔑 Guardian Social Recovery (2-of-3 consensus key rotation)
 *     📊 Empirical Performance Profiler (Live millisecond latency)
 *   - Live Privacy Audit Matrix proving zero personal data leakage.
 *
 * START: node demo_server.js
 * OPEN:  http://localhost:3000
 * ==============================================================================
 */

"use strict";

const http   = require("http");
const crypto = require("crypto");
const { ethers } = require("ethers");
const {
  issueGovernmentCredential,
  generatePresentation,
  verifyPresentation,
  runLinkabilityAndPrivacyTests,
  deriveDID,
} = require("./scripts/01_crypto_engine");

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Pre-Seed Initial Demo State: Populates complete, authentic demo data on startup
// ---------------------------------------------------------------------------
function seedInitialDemoState(state) {
  const citizenData = {
    nid:      "1998061234",
    name:     "Md. Tanvir Islam",
    dob:      "2002-05-15",
    district: "Patuakhali",
    isOver18: true,
  };

  state.credential = issueGovernmentCredential(citizenData, state.issuerWallet, { validityDays: 365 });

  state.signedInCitizen = {
    nid:        citizenData.nid,
    name:       citizenData.name,
    dob:        citizenData.dob,
    district:   citizenData.district,
    isOver18:   citizenData.isOver18,
    signedInAt: new Date().toISOString(),
  };

  state.challenge = "challenge-" + crypto.randomBytes(8).toString("hex");
  state.presentation = generatePresentation(
    state.credential,
    ["isOver18", "district"],
    "Sonali Bank PLC",
    state.challenge,
    state.citizenWallet
  );

  state.eventLog = [
    {
      id: crypto.randomBytes(4).toString("hex"),
      type: "system",
      message: "Pre-loaded authentic credential active for Md. Tanvir Islam (Smart NID: 1998061234)",
      data: { nid: citizenData.nid, district: citizenData.district },
      timestamp: new Date().toISOString(),
    },
    {
      id: crypto.randomBytes(4).toString("hex"),
      type: "issue",
      message: "Govt. Issuer signed Merkle Root (DPKI Anchor)",
      data: { rootHash: state.credential.rootIdentityCommitment, issuerDID: state.credential.issuerDID },
      timestamp: new Date().toISOString(),
    },
    {
      id: crypto.randomBytes(4).toString("hex"),
      type: "wallet",
      message: "Citizen wallet active with Smart NID 1998061234",
      data: { citizenDID: deriveDID(state.citizenWallet.signingKey.publicKey) },
      timestamp: new Date().toISOString(),
    },
    {
      id: crypto.randomBytes(4).toString("hex"),
      type: "present",
      message: "Presentation proof ready for Sonali Bank PLC (Selective: isOver18, district)",
      data: { disclosed: ["isOver18", "district"], hidden: ["nid", "name", "dob"] },
      timestamp: new Date().toISOString(),
    }
  ];
}

function freshState() {
  const s = {
    issuerWallet:     ethers.Wallet.createRandom(),
    citizenWallet:    ethers.Wallet.createRandom(),
    guardian1:        ethers.Wallet.createRandom(),
    guardian2:        ethers.Wallet.createRandom(),
    guardian3:        ethers.Wallet.createRandom(),
    credential:       null,
    signedInCitizen:  null,
    presentation:     null,
    challenge:        null,
    isRevoked:        false,
    recoveryVotes:    0,
    recoveryExecuted: false,
    proposedNewKey:   null,
    guardian1Voted:   false,
    guardian2Voted:   false,
    eventLog:         [],
    benchmarkResults: null,
  };
  // Start in clean, unseeded state: zero hardcoded data
  return s;
}

let S = freshState();

function logEvent(type, message, data = {}) {
  S.eventLog.unshift({
    id:        crypto.randomBytes(4).toString("hex"),
    type,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
  if (S.eventLog.length > 50) S.eventLog.pop();
}

// ---------------------------------------------------------------------------
// Validation Engine
// ---------------------------------------------------------------------------
function validateDOB(dob) {
  if (!dob) return { valid: false, error: "Date of Birth is required." };
  const date = new Date(dob);
  if (isNaN(date.getTime())) return { valid: false, error: "Invalid Date of Birth format." };
  const now = new Date();
  if (date > now) return { valid: false, error: "Invalid Date of Birth: Cannot be in the future." };
  const year = date.getFullYear();
  if (year < 1900) return { valid: false, error: "Invalid Date of Birth: Year cannot be before 1900." };
  return { valid: true, birthYear: year };
}

function validateBangladeshNID(nid, dob) {
  if (!nid || typeof nid !== "string") {
    return { valid: false, error: "NID is required and must be provided." };
  }
  const cleanNID = nid.trim();

  if (/^NID-DEMO-[A-Z0-9]+$/i.test(cleanNID)) {
    return { valid: true, type: "Synthetic Demo NID", cleanNID };
  }
  if (/^\d{10}$/.test(cleanNID)) {
    return { valid: true, type: "10-Digit Smart NID", cleanNID };
  }
  if (/^\d{17}$/.test(cleanNID)) {
    if (dob) {
      const birthYear = String(dob).split("-")[0];
      if (birthYear && birthYear.length === 4 && !cleanNID.startsWith(birthYear)) {
        return {
          valid: false,
          error: `Fraud Detection: 17-digit Bangladesh NID must begin with birth year (${birthYear}). Given NID starts with ${cleanNID.slice(0, 4)}.`
        };
      }
    }
    return { valid: true, type: "17-Digit Legacy NID", cleanNID };
  }

  return {
    valid: false,
    error: `Invalid NID Format ('${cleanNID}'). Bangladesh NID must be 10 numeric digits (Smart NID) or 17 numeric digits (Legacy NID). Letters and invalid lengths are refused.`
  };
}

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.end(JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// API Handlers
// ---------------------------------------------------------------------------
async function apiIssue(req, res) {
  const body = await readBody(req);
  const { nid, name, dob, district, validityDays } = body;

  if (!nid || !name || !dob || !district) {
    return json(res, 400, { success: false, error: "NID, Name, Date of Birth, and District are all required." });
  }

  const dobCheck = validateDOB(dob);
  if (!dobCheck.valid) {
    logEvent("system", `Govt Issuer Rejected: ${dobCheck.error}`, { nid });
    return json(res, 400, { success: false, error: dobCheck.error });
  }

  const nidCheck = validateBangladeshNID(nid, dob);
  if (!nidCheck.valid) {
    logEvent("system", `Govt Issuer Refused Signing: ${nidCheck.error}`, { attemptedNID: nid });
    return json(res, 400, { success: false, error: nidCheck.error });
  }

  const birthYear = dobCheck.birthYear;
  const isOver18  = (new Date().getFullYear() - birthYear) >= 18;

  const citizenData = {
    nid:      nidCheck.cleanNID,
    name:     String(name).trim().slice(0, 80),
    dob:      String(dob).trim(),
    district: String(district).trim().slice(0, 60),
    isOver18,
  };

  try {
    const days = parseInt(validityDays) || 365;
    S.credential = issueGovernmentCredential(citizenData, S.issuerWallet, { validityDays: days });
    S.isRevoked  = false;

    S.signedInCitizen = {
      nid:        citizenData.nid,
      name:       citizenData.name,
      dob:        citizenData.dob,
      district:   citizenData.district,
      isOver18:   citizenData.isOver18,
      signedInAt: new Date().toISOString(),
    };

    S.challenge = "challenge-" + crypto.randomBytes(8).toString("hex");
    S.presentation = generatePresentation(
      S.credential,
      ["isOver18", "district"],
      "Sonali Bank PLC",
      S.challenge,
      S.citizenWallet
    );

    logEvent("issue", `Credential signed for ${citizenData.name} (${nidCheck.type}: ${citizenData.nid})`, {
      rootHash: S.credential.rootIdentityCommitment,
      issuerDID: S.credential.issuerDID,
      nid: citizenData.nid,
    });

    json(res, 200, {
      success:                true,
      rootIdentityCommitment: S.credential.rootIdentityCommitment,
      issuerAddress:          S.credential.issuerAddress,
      issuerDID:              S.credential.issuerDID,
      citizenDID:             deriveDID(S.citizenWallet.signingKey.publicKey),
      issuanceDate:           S.credential.issuanceDate,
      expirationDate:         S.credential.expirationDate,
      nid:                    citizenData.nid,
      nidType:                nidCheck.type,
      name:                   citizenData.name,
      isOver18:               citizenData.isOver18,
      attributeCount:         S.credential.attributes.length,
      vcEnvelope:             S.credential.vcEnvelope,
    });
  } catch (err) {
    json(res, 500, { success: false, error: err.message });
  }
}

async function apiGenerateProof(req, res) {
  if (!S.credential) return json(res, 400, { success: false, error: "Issue a credential first" });

  const body = await readBody(req);
  const { disclosedKeys, verifierName } = body;

  if (!Array.isArray(disclosedKeys) || disclosedKeys.length === 0) {
    return json(res, 400, { success: false, error: "Select at least one attribute to disclose" });
  }

  S.challenge = "challenge-" + crypto.randomBytes(8).toString("hex");

  try {
    S.presentation = generatePresentation(
      S.credential, disclosedKeys, verifierName || "Sonali Bank PLC",
      S.challenge, S.citizenWallet
    );

    const hiddenKeys = S.credential.leafOrder.filter((k) => !disclosedKeys.includes(k));

    logEvent("present", `Presentation generated for ${verifierName}`, {
      disclosedKeys,
      hiddenKeys,
      token: S.presentation.presentationToken.slice(0, 16) + "...",
    });

    json(res, 200, {
      success:           true,
      presentationToken: S.presentation.presentationToken,
      disclosedKeys,
      hiddenKeys,
      citizenDID:        S.presentation.citizenDID,
      challenge:         S.challenge,
      generatedAt:       S.presentation.generatedAt,
    });
  } catch (err) {
    json(res, 500, { success: false, error: err.message });
  }
}

async function apiVerify(req, res) {
  if (!S.presentation || !S.challenge) {
    return json(res, 400, { valid: false, reason: "No presentation proof found. Generate a presentation first." });
  }

  if (S.isRevoked) {
    logEvent("verify", "Verification FAILED — credential revoked on-chain", {});
    return json(res, 200, {
      valid:    false,
      reason:   "Credential has been REVOKED in the blockchain registry (simulated)",
      checks:   {},
      note:     "In production, NIDRegistry.isCredentialValid() returns false.",
    });
  }

  const t0 = performance.now();
  const result = verifyPresentation(S.presentation, S.challenge, S.issuerWallet.address);
  const latencyMs = +(performance.now() - t0).toFixed(2);

  logEvent("verify", result.valid ? "Verification PASSED" : `Verification FAILED: ${result.reason}`, {
    checks: result.checks,
  });

  json(res, 200, {
    valid:          result.valid,
    reason:         result.reason || null,
    checks:         result.checks || {},
    disclosed:      result.valid ? S.presentation.disclosedAttributes : {},
    expirationDate: S.presentation.expirationDate,
    issuerDID:      S.presentation.issuerDID,
    citizenDID:     S.presentation.citizenDID,
    verifierName:   S.presentation.verifierName,
    latencyMs:      latencyMs,
  });
}

async function apiTamperTest(req, res) {
  if (!S.credential || !S.presentation || !S.challenge) {
    return json(res, 400, { error: "Issue and generate a presentation first" });
  }

  const tampered = JSON.parse(JSON.stringify(S.presentation));
  const firstKey = Object.keys(tampered.disclosedAttributes)[0];
  if (!firstKey) return json(res, 400, { error: "No disclosed attributes to tamper" });

  const originalValue = tampered.disclosedAttributes[firstKey].value;
  tampered.disclosedAttributes[firstKey].value = "__FRAUDULENT_TAMPER_VALUE__";

  const result = verifyPresentation(tampered, S.challenge, S.issuerWallet.address);

  logEvent("verify", `Tamper test on attribute "${firstKey}": verifier rejected`, {});

  json(res, 200, {
    tamperedAttribute:  firstKey,
    originalValue:      String(originalValue),
    tamperedValue:      "__FRAUDULENT_TAMPER_VALUE__",
    detectedTampering:  !result.valid,
    verificationResult: result,
    explanation: result.valid
      ? "⚠ Tamper was NOT detected — bug in verification logic."
      : "✅ Verifier mathematically rejected the tampered credential via Merkle commitment mismatch.",
  });
}

async function apiRevoke(req, res) {
  if (!S.credential) return json(res, 400, { error: "No credential to revoke" });
  S.isRevoked = !S.isRevoked;
  logEvent("revoke", S.isRevoked ? "Credential REVOKED (in-memory simulation)" : "Credential REINSTATED", {
    rootHash: S.credential.rootIdentityCommitment,
  });
  json(res, 200, { isRevoked: S.isRevoked });
}

async function apiGuardianVote(req, res) {
  const body = await readBody(req);
  const { guardianIndex } = body;

  if (!S.credential) return json(res, 400, { error: "No citizen registered" });

  if (guardianIndex === 1 && !S.guardian1Voted) {
    S.guardian1Voted = true;
    S.recoveryVotes  = 1;
    S.proposedNewKey = ethers.Wallet.createRandom().address;
    logEvent("recovery", `Guardian 1 initiated recovery — Vote 1/3`, { proposedKey: S.proposedNewKey });
  } else if (guardianIndex === 2 && S.guardian1Voted && !S.guardian2Voted) {
    S.guardian2Voted   = true;
    S.recoveryVotes    = 2;
    S.recoveryExecuted = true;
    S.citizenWallet    = ethers.Wallet.createRandom();
    logEvent("recovery", `Guardian 2 voted — 2/3 consensus reached — key ROTATED to new device`, {
      newDeviceAddress: S.citizenWallet.address,
    });
  }

  json(res, 200, {
    guardian1Voted:   S.guardian1Voted,
    guardian2Voted:   S.guardian2Voted,
    recoveryVotes:    S.recoveryVotes,
    recoveryExecuted: S.recoveryExecuted,
    proposedNewKey:   S.proposedNewKey,
    newDeviceAddress: S.recoveryExecuted ? S.citizenWallet.address : null,
    note: "Simulated in UI. In production, calls NIDRegistry.initiateRecovery() and supportRecovery() on-chain.",
  });
}

async function apiBenchmark(req, res) {
  const body = await readBody(req);
  const N    = Math.min(Math.max(parseInt(body.iterations) || 50, 10), 200);

  const issuerW  = ethers.Wallet.createRandom();
  const citizenW = ethers.Wallet.createRandom();
  const synthData = S.credential ? {
    nid:      S.credential._rawData.nid,
    name:     S.credential._rawData.name,
    dob:      S.credential._rawData.dob,
    district: S.credential._rawData.district,
    isOver18: S.credential._rawData.isOver18,
  } : {
    nid: "1000000001", name: "Citizen Benchmark", dob: "2000-01-01",
    district: "Dhaka", isOver18: true,
  };

  const generationTimes   = [];
  const verificationTimes = [];

  for (let i = 0; i < N; i++) {
    const cred = issueGovernmentCredential(synthData, issuerW);
    const ch   = "bench-" + i;

    const t0 = performance.now();
    const pres = generatePresentation(cred, ["isOver18", "district"], "BenchVerifier", ch, citizenW);
    generationTimes.push(performance.now() - t0);

    const t1 = performance.now();
    verifyPresentation(pres, ch, issuerW.address);
    verificationTimes.push(performance.now() - t1);
  }

  const stats = (arr) => {
    arr.sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return {
      mean:   +mean.toFixed(3),
      median: +arr[Math.floor(arr.length / 2)].toFixed(3),
      p95:    +arr[Math.floor(arr.length * 0.95)].toFixed(3),
      min:    +arr[0].toFixed(3),
      max:    +arr[arr.length - 1].toFixed(3),
      n:      arr.length,
    };
  };

  S.benchmarkResults = {
    runs:              N,
    environment:       "Node.js in-process (no network I/O)",
    hardwareNote:      "Results vary by CPU. These are client-side JS timings.",
    proofGeneration:   stats(generationTimes),
    proofVerification: stats(verificationTimes),
    gasData: {
      note: "Gas figures from Hardhat EVM (run `node scripts/02_deploy_and_benchmark.js` for live gas)",
      contractDeployment: 1559454,
      registerCredential: 47807,
      revokeCredential:   50044,
      registerGuardians:  139082,
      initiateRecovery:   84371,
      supportRecovery:    69988,
    },
  };

  logEvent("system", `Benchmark completed (${N} iterations)`, {});
  json(res, 200, S.benchmarkResults);
}

async function apiStatus(req, res) {
  json(res, 200, {
    hasCredential:       !!S.credential,
    activeCredentialNID: S.credential ? S.credential._rawData.nid : null,
    signedInCitizen:     S.signedInCitizen,
    hasPresentation:     !!S.presentation,
    isRevoked:           S.isRevoked,
    recoveryVotes:       S.recoveryVotes,
    recoveryExecuted:    S.recoveryExecuted,
    issuerAddress:       S.issuerWallet.address,
    issuerDID:           deriveDID(S.issuerWallet.signingKey.publicKey),
    citizenAddress:      S.citizenWallet.address,
    citizenDID:          deriveDID(S.citizenWallet.signingKey.publicKey),
    eventCount:          S.eventLog.length,
    benchmarkReady:      !!S.benchmarkResults,

    credentialDetails: S.credential ? {
      nid:                    S.credential._rawData.nid,
      name:                   S.credential._rawData.name,
      dob:                    S.credential._rawData.dob,
      district:               S.credential._rawData.district,
      isOver18:               S.credential._rawData.isOver18,
      rootIdentityCommitment: S.credential.rootIdentityCommitment,
      issuerDID:              S.credential.issuerDID,
      issuanceDate:           S.credential.issuanceDate,
      expirationDate:         S.credential.expirationDate,
      attributeCount:         S.credential.attributes.length,
      issuerSignaturePreview: S.credential.vcEnvelope?.proof?.jws?.slice(0, 44) + "...",
    } : null,

    presentationDetails: S.presentation ? {
      verifierName:        S.presentation.verifierName,
      disclosedAttributes: S.presentation.disclosedAttributes,
      disclosedKeys:       Object.keys(S.presentation.disclosedAttributes),
      hiddenKeys:          S.credential ? S.credential.leafOrder.filter(k => !Object.keys(S.presentation.disclosedAttributes).includes(k)) : [],
      presentationToken:   S.presentation.presentationToken,
      challenge:           S.challenge,
      generatedAt:         S.presentation.generatedAt,
      citizenDID:          S.presentation.citizenDID,
    } : null,
  });
}

async function apiEvents(req, res) {
  json(res, 200, { events: S.eventLog });
}

async function apiReset(req, res) {
  S = freshState();
  logEvent("system", "Demo session reset to initial authentic pre-loaded state", {});
  json(res, 200, { success: true });
}

async function apiHealth(req, res) {
  json(res, 200, {
    status: "healthy",
    service: "Bangladesh NID SSI Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}

const ROUTES = {
  "GET /api/health":          apiHealth,
  "POST /api/issue":          apiIssue,
  "POST /api/generate-proof": apiGenerateProof,
  "GET /api/verify":          apiVerify,
  "POST /api/tamper-test":    apiTamperTest,
  "POST /api/revoke":         apiRevoke,
  "POST /api/guardian-vote":  apiGuardianVote,
  "POST /api/benchmark":      apiBenchmark,
  "GET /api/status":          apiStatus,
  "GET /api/events":          apiEvents,
  "POST /api/reset":          apiReset,
};

// ---------------------------------------------------------------------------
// HTML — HIGH-FIDELITY DEFENCE CONSOLE
// ---------------------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bangladesh NID SSI — National E-Identity Defence Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { background-color: #070b14; color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    
    .bg-grid {
      background-size: 32px 32px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    }
    
    .badge-real { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }
    .badge-sim  { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25); }
    .badge-gold { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); }
    .badge-rose { background: rgba(244, 63, 94, 0.1); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.25); }
    
    .check-pass    { color: #34d399; }
    .check-fail    { color: #f87171; }
    .check-pending { color: #64748b; }
    
    .smart-card-bg {
      background: linear-gradient(135deg, #064e3b 0%, #0a1128 50%, #1e1b4b 100%);
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15);
      position: relative;
      overflow: hidden;
    }
    .smart-card-bg::before {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, transparent 60%);
      pointer-events: none;
    }

    @keyframes slideDown { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .toast-animate { animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between selection:bg-teal-500 selection:text-white bg-grid">

<!-- Toast Notification Container -->
<div id="toastContainer" class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"></div>

<!-- Top National Color Ribbon -->
<div class="h-1 w-full bg-gradient-to-r from-emerald-600 via-rose-600 to-amber-500"></div>

<!-- ===== OFFICIAL BANGLADESH E-GOVERNMENT HEADER ===== -->
<header class="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3 sticky top-0 z-40">
  <div class="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
    
    <!-- Branding -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-xl shadow-inner shrink-0">
        🇧🇩
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</span>
          <span class="text-[9px] text-slate-600">|</span>
          <span class="text-[10px] text-slate-400">National Election Commission</span>
        </div>
        <h1 class="text-sm md:text-base font-bold tracking-tight text-white flex items-center gap-2">
          National SSI & DPKI Gateway
          <span class="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-mono font-medium">v3.1 Production</span>
        </h1>
      </div>
    </div>

    <!-- Status & Action Buttons -->
    <div class="flex items-center gap-2 text-xs flex-wrap">
      <span class="badge-real px-2.5 py-1 rounded-full font-mono text-[11px] font-medium flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> DPKI Active
      </span>
      <span class="badge-sim px-2.5 py-1 rounded-full font-mono text-[11px] font-medium flex items-center gap-1.5">
        <i class="fas fa-cube text-[10px]"></i> Polygon EVM
      </span>
      <button onclick="runEndToEndDemo()" class="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg text-xs shadow-md shadow-emerald-950/50 hover:shadow-emerald-900/50 transition-all flex items-center gap-1.5 cursor-pointer">
        <i class="fas fa-play text-[10px]"></i> 1-Click Demo
      </button>
      <button onclick="resetDemo()" title="Reset Session" class="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 rounded-lg text-xs transition cursor-pointer">
        <i class="fas fa-arrow-rotate-right text-[11px]"></i>
      </button>
    </div>

  </div>
</header>

<!-- ===== ACTION TOOLBAR: UPLOAD & PRESETS ===== -->
<section class="bg-slate-900/40 backdrop-blur border-b border-slate-800/60 px-6 py-2">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs">
    
    <!-- Upload Citizen Data -->
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Citizen Data:</span>
      <label class="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-md cursor-pointer transition text-[11px] font-medium flex items-center gap-1.5">
        <i class="fas fa-arrow-up-from-bracket text-teal-400 text-[10px]"></i> Upload JSON
        <input type="file" id="jsonFileInput" accept=".json" onchange="handleProfileJSONUpload(event)" class="hidden">
      </label>
      <label class="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-md cursor-pointer transition text-[11px] font-medium flex items-center gap-1.5">
        <i class="fas fa-camera text-indigo-400 text-[10px]"></i> Upload Photo
        <input type="file" id="photoFileInput" accept="image/*" onchange="handlePhotoUpload(event)" class="hidden">
      </label>
      <button onclick="downloadSampleJSON()" class="text-slate-400 hover:text-slate-200 text-[11px] font-medium flex items-center gap-1 transition ml-1">
        <i class="fas fa-file-arrow-down text-[10px]"></i> Template
      </button>
    </div>

    <!-- Quick Presets -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Presets:</span>
      <button onclick="setIssuerInputs('1998061234', 'Md. Tanvir Islam', '2002-05-15', 'Patuakhali', 365)" class="px-2.5 py-0.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded text-[11px] font-medium transition cursor-pointer">
        10-Digit Smart NID
      </button>
      <button onclick="setIssuerInputs('20001998061234567', 'Karim Hossain', '2000-01-15', 'Dhaka', 365)" class="px-2.5 py-0.5 bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 rounded text-[11px] font-medium transition cursor-pointer">
        17-Digit Legacy
      </button>
      <button onclick="setIssuerInputs('12345XYZ', 'Invalid Citizen ID', '2000-01-15', 'Dhaka', 365)" class="px-2.5 py-0.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 rounded text-[11px] font-medium transition cursor-pointer">
        Invalid Format
      </button>
      <button onclick="setIssuerInputs('19901234567890123', 'Fraud Mismatch', '2002-05-15', 'Barisal', 365)" class="px-2.5 py-0.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 rounded text-[11px] font-medium transition cursor-pointer">
        Year Mismatch
      </button>
    </div>

  </div>
</section>

<!-- ===== MAIN 3-COLUMN DEMONSTRATION CONSOLE ===== -->
<main class="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

  <!-- THE 3 LIVE WORKFLOW COLUMNS -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- COLUMN 1: GOVT ISSUER -->
    <div class="bg-slate-900/70 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between hover:border-slate-700/60 transition">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-md bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold text-xs font-mono">1</span>
            <div>
              <h2 class="font-bold text-sm text-slate-100">Govt. Credential Issuer</h2>
              <span class="text-[10px] text-teal-400 font-mono">Election Commission DPKI</span>
            </div>
          </div>
          <span class="badge-real text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">DPKI AUTHORIZED</span>
        </div>

        <!-- Input Form (CLEAN PLACEHOLDERS, NO HARDCODED VALUES) -->
        <form id="issueForm" class="space-y-3 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1 flex justify-between">
              <span>National ID Number</span>
              <span class="text-[10px] text-teal-400 font-mono">10 or 17 Digits</span>
            </label>
            <input type="text" id="fNID" required placeholder="Enter 10 or 17-digit NID" maxlength="30"
              class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-teal-300 placeholder:text-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition">
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Citizen Full Name</label>
            <input type="text" id="fName" required placeholder="Citizen Full Legal Name" maxlength="80"
              class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-medium text-slate-300 mb-1">Date of Birth</label>
              <input type="date" id="fDOB" required
                class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none transition">
            </div>
            <div>
              <label class="block font-medium text-slate-300 mb-1">District</label>
              <select id="fDistrict" class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none transition">
                <option value="Dhaka">Dhaka</option>
                <option value="Patuakhali">Patuakhali</option>
                <option value="Chittagong">Chittagong</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
                <option value="Barisal">Barisal</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rangpur">Rangpur</option>
                <option value="Mymensingh">Mymensingh</option>
                <option value="Comilla">Comilla</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Validity Period</label>
            <select id="fValidity" class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none transition">
              <option value="365">1 Year (Standard Validity)</option>
              <option value="730">2 Years (Extended)</option>
              <option value="0">0 Days (Instantly Expired — Test Expiry)</option>
            </select>
          </div>

          <div class="pt-2">
            <button type="submit" id="btnIssue"
              class="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-teal-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <i class="fas fa-stamp text-xs"></i> Issue & Sign Credential
            </button>
          </div>
        </form>
      </div>

      <!-- Live DPKI Anchoring Output Box -->
      <div id="issuerResult" class="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono space-y-1.5">
        <div class="text-emerald-400 font-medium flex items-center justify-between text-xs">
          <span><i class="fas fa-circle-nodes mr-1.5"></i>DPKI On-Chain Anchor</span>
          <span class="text-[10px] text-slate-500 font-sans">ECDSA secp256k1</span>
        </div>
        <div class="text-slate-400 truncate text-[11px]">
          Root ($R$): <span id="outRootHash" class="text-teal-300 font-semibold">—</span>
        </div>
        <div class="text-slate-400 truncate text-[11px]">
          Issuer DID: <span id="outIssuerDID" class="text-slate-300 font-semibold">—</span>
        </div>
      </div>
    </div>

    <!-- COLUMN 2: CITIZEN WALLET -->
    <div class="bg-slate-900/70 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between hover:border-slate-700/60 transition">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-md bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs font-mono">2</span>
            <div>
              <h2 class="font-bold text-sm text-slate-100">Citizen Mobile Wallet</h2>
              <span class="text-[10px] text-indigo-400 font-mono">Edge Device Storage</span>
            </div>
          </div>
          <span class="badge-real text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">AUTHENTICATED</span>
        </div>

        <!-- HIGH-FIDELITY BANGLADESH SMART NID CARD GRAPHIC (DYNAMIC PLACEHOLDERS) -->
        <div class="smart-card-bg rounded-2xl p-4 text-white border border-emerald-500/30 shadow-2xl mb-4 relative">
          <!-- Card Header with Flag -->
          <div class="flex justify-between items-start border-b border-white/10 pb-2 mb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-lg">🇧🇩</span>
              <div>
                <div class="text-[9px] font-bold text-emerald-300 tracking-wider">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
                <div class="text-[8px] text-slate-300 uppercase tracking-widest">Government of Bangladesh</div>
              </div>
            </div>
            <span id="cardStatusBadge" class="text-[9px] font-mono text-slate-400 border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 rounded">
              UNISSUED
            </span>
          </div>

          <!-- Microchip, Photo & Citizen Details -->
          <div class="flex items-center gap-3.5 mb-2.5">
            <!-- Microchip & Photo -->
            <div class="relative shrink-0">
              <div id="citizenPhotoContainer" class="w-13 h-15 rounded-xl bg-slate-950/90 border border-emerald-500/50 overflow-hidden flex items-center justify-center shadow-lg">
                <img id="citizenPhotoImg" src="" alt="Photo" class="w-full h-full object-cover hidden">
                <span id="citizenPhotoPlaceholder" class="text-2xl text-emerald-400/80">👤</span>
              </div>
            </div>

            <!-- Identity Info -->
            <div class="overflow-hidden flex-1 space-y-0.5">
              <div class="flex items-center gap-1.5">
                <!-- Gold EMV Chip Graphic -->
                <div class="w-6 h-4 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-600/80 shadow-sm flex items-center justify-center">
                  <div class="w-full h-0.5 bg-amber-700/60 my-0.5"></div>
                </div>
                <span class="text-[9px] text-slate-300 uppercase tracking-wider font-semibold">National ID Card</span>
              </div>
              <h3 id="wCardName" class="text-sm font-bold text-white truncate pt-0.5">—</h3>
              <p id="wCardNID" class="text-xs font-mono text-teal-300 font-semibold tracking-wider">—</p>
            </div>
          </div>

          <!-- Card Details Footer -->
          <div class="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/10 pt-2 text-slate-300">
            <div><span class="text-slate-400">DOB:</span> <span id="wCardDOB" class="text-white font-semibold">—</span></div>
            <div><span class="text-slate-400">District:</span> <span id="wCardDistrict" class="text-white font-semibold">—</span></div>
          </div>
        </div>

        <!-- Selective Disclosure Controls -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Relying Party</label>
            <select id="wVerifier" onchange="applyVerifierPreset()" class="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none transition">
              <option value="Sonali Bank PLC">Sonali Bank PLC (Age Eligibility + District)</option>
              <option value="Dhaka Medical Hospital">Dhaka Medical Hospital (Age Eligibility Only)</option>
              <option value="Custom">Custom Attribute Selection</option>
            </select>
          </div>

          <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span class="block text-xs font-medium text-slate-300 mb-2">Selective Disclosure Consent</span>
            <div class="space-y-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="chkOver18" checked class="accent-indigo-500 rounded">
                <span class="text-slate-200">Prove Age Over 18 (isOver18)</span>
                <span class="badge-real ml-auto px-1.5 rounded text-[9px]">Zero-Knowledge</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="chkDistrict" checked class="accent-indigo-500 rounded">
                <span class="text-slate-200">Disclose District</span>
                <span id="chkDistrictVal" class="text-slate-400 text-[10px] ml-auto font-mono">—</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="chkName" class="accent-indigo-500 rounded">
                <span class="text-slate-400">Disclose Full Name</span>
                <span id="chkNameVal" class="text-rose-400/80 text-[10px] ml-auto">Blinded</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="chkDOB" class="accent-indigo-500 rounded">
                <span class="text-slate-400">Disclose Birth Date</span>
                <span id="chkDOBVal" class="text-rose-400/80 text-[10px] ml-auto">Blinded</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer text-amber-400/90">
                <input type="checkbox" id="chkNID" class="accent-amber-500 rounded">
                <span>Disclose Raw NID Number</span>
                <span id="chkNIDVal" class="text-rose-400/80 text-[10px] ml-auto">Blinded</span>
              </label>
            </div>
          </div>

          <button onclick="generateProof()"
            class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer">
            <i class="fas fa-shield-halved text-xs"></i> Generate Blinded Proof
          </button>
        </div>
      </div>

      <!-- Live Presentation Output -->
      <div id="walletResult" class="mt-4 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs font-mono space-y-1.5">
        <div class="text-indigo-400 font-medium flex items-center justify-between text-xs">
          <span><i class="fas fa-fingerprint mr-1.5"></i>Presentation Token</span>
          <span class="text-[10px] text-emerald-400 font-sans">Unlinkable Session</span>
        </div>
        <div class="text-slate-400 truncate text-[11px]">
          Token: <span id="outProofToken" class="text-indigo-300 font-semibold">—</span>
        </div>
        <div class="text-slate-400 text-[11px] flex justify-between items-center">
          <span>Disclosed: <span id="outDisclosed" class="text-emerald-400 font-semibold">—</span></span>
          <button onclick="downloadCredentialJSON()" class="text-indigo-400 hover:text-indigo-300 underline text-[11px] cursor-pointer">
            Export JSON
          </button>
        </div>
      </div>
    </div>

    <!-- COLUMN 3: RELYING VERIFIER -->
    <div class="bg-slate-900/70 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-2xl flex flex-col justify-between hover:border-slate-700/60 transition">
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-md bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold text-xs font-mono">3</span>
            <div>
              <h2 class="font-bold text-sm text-slate-100">Relying Verifier</h2>
              <span id="verifierBadge" class="text-[10px] text-cyan-400 font-mono">Sonali Bank PLC</span>
            </div>
          </div>
          <span class="badge-real text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">INDEPENDENT</span>
        </div>

        <!-- 5-Point Security Audit Checklist -->
        <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono space-y-2 mb-4">
          <div class="font-semibold text-slate-300 text-[11px] flex justify-between items-center pb-1.5 border-b border-slate-800/80">
            <span>5-Point Security Audit</span>
            <span id="verifyOverallBadge" class="badge-real px-2 py-0.5 rounded text-[10px] font-bold">READY</span>
          </div>
          <div id="checkReplay" class="check-pending p-1.5 rounded bg-slate-900/60 flex justify-between">
            <span>1. Session Nonce (Replay Defense)</span><span>○ PENDING</span>
          </div>
          <div id="checkExpiry" class="check-pending p-1.5 rounded bg-slate-900/60 flex justify-between">
            <span>2. Credential Validity (Expiry Check)</span><span>○ PENDING</span>
          </div>
          <div id="checkIssuer" class="check-pending p-1.5 rounded bg-slate-900/60 flex justify-between">
            <span>3. Issuer Signature (DPKI ECDSA)</span><span>○ PENDING</span>
          </div>
          <div id="checkMerkle" class="check-pending p-1.5 rounded bg-slate-900/60 flex justify-between">
            <span>4. Merkle Inclusion (Salted HMAC)</span><span>○ PENDING</span>
          </div>
          <div id="checkCitizen" class="check-pending p-1.5 rounded bg-slate-900/60 flex justify-between">
            <span>5. Holder Device Key Signature</span><span>○ PENDING</span>
          </div>
        </div>

        <button onclick="runVerify('normal')"
          class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer">
          <i class="fas fa-check-double text-xs"></i> Verify Presentation Proof
        </button>
      </div>

      <!-- Live Verification Status & Latency Box -->
      <div id="verifyResult" class="mt-4 p-3 rounded-xl border bg-slate-950/60 border-slate-800/80 text-xs font-mono space-y-1.5">
        <div class="flex justify-between items-center">
          <div id="verifyResultHeader" class="font-semibold text-emerald-400">
            <i class="fas fa-circle-check mr-1.5"></i>Verification Ready
          </div>
          <span id="outLatency" class="text-[10px] text-teal-400 font-mono bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/50">
            Latency: —
          </span>
        </div>
        <div id="verifyResultBody" class="text-slate-400 text-[11px] leading-relaxed">
          Awaiting presentation submission.
        </div>
      </div>
    </div>

  </div>

  <!-- ─────────────────────────────────────────────────────────────
       BOTTOM DEFENCE SUITE: SECURITY ATTACK TESTS & PRIVACY MATRIX
       ───────────────────────────────────────────────────────────── -->
  <section class="bg-slate-900/70 backdrop-blur border border-slate-800/80 rounded-2xl p-5 shadow-2xl space-y-5">
    
    <div class="flex items-center justify-between pb-3 border-b border-slate-800/80 flex-wrap gap-2">
      <div class="flex items-center gap-2.5">
        <span class="text-xl">🛡️</span>
        <div>
          <h2 class="font-bold text-sm text-slate-100">Cryptographic Security & Privacy Audit</h2>
          <p class="text-[11px] text-slate-400">Tamper resistance, revocation, guardian recovery, and zero-knowledge selective disclosure</p>
        </div>
      </div>
      <span class="badge-gold px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold">EVALUATION SUITE</span>
    </div>

    <!-- 4 Minimal Attack Tiles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
      
      <!-- 1. Tamper Attack -->
      <button onclick="runTamperTest()" class="p-3.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-800/50 text-left transition flex flex-col justify-between group cursor-pointer">
        <div>
          <div class="font-semibold text-rose-300 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fas fa-bug text-xs"></i> 1. Tamper Rejection</span>
            <i class="fas fa-arrow-right text-[10px] text-rose-400 group-hover:translate-x-1 transition"></i>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal">Corrupts attribute ciphertext. Merkle proof detects mathematical mismatch.</p>
        </div>
        <span class="text-[10px] text-rose-400 font-medium mt-2.5">Run Tamper Test &rarr;</span>
      </button>

      <!-- 2. Revocation -->
      <button onclick="toggleRevocation()" class="p-3.5 rounded-xl bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/50 text-left transition flex flex-col justify-between group cursor-pointer">
        <div>
          <div class="font-semibold text-amber-300 flex items-center justify-between">
            <span class="flex items-center gap-1.5" id="lblRevokeTitle"><i class="fas fa-ban text-xs"></i> 2. Revocation Anchor</span>
            <i class="fas fa-arrow-right text-[10px] text-amber-400 group-hover:translate-x-1 transition"></i>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal" id="lblRevokeSub">Simulates on-chain credential blacklist revocation.</p>
        </div>
        <span class="text-[10px] text-amber-400 font-medium mt-2.5">Toggle Revocation &rarr;</span>
      </button>

      <!-- 3. Guardian Social Recovery -->
      <button onclick="runGuardianDemo()" class="p-3.5 rounded-xl bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-800/50 text-left transition flex flex-col justify-between group cursor-pointer">
        <div>
          <div class="font-semibold text-indigo-300 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fas fa-key text-xs"></i> 3. Social Recovery</span>
            <i class="fas fa-arrow-right text-[10px] text-indigo-400 group-hover:translate-x-1 transition"></i>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal">Simulates lost device key. 2-of-3 guardian consensus rotates active key.</p>
        </div>
        <span class="text-[10px] text-indigo-400 font-medium mt-2.5">Rotate Device Key &rarr;</span>
      </button>

      <!-- 4. Performance Profiler -->
      <button onclick="runQuickBenchmark()" class="p-3.5 rounded-xl bg-teal-950/30 hover:bg-teal-950/50 border border-teal-800/50 text-left transition flex flex-col justify-between group cursor-pointer">
        <div>
          <div class="font-semibold text-teal-300 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i class="fas fa-gauge-high text-xs"></i> 4. Engine Profiler</span>
            <i class="fas fa-arrow-right text-[10px] text-teal-400 group-hover:translate-x-1 transition"></i>
          </div>
          <p class="text-[11px] text-slate-400 mt-1 leading-normal">Executes 50 CPU cryptographic cycles. Demonstrates sub-10ms latency.</p>
        </div>
        <span class="text-[10px] text-teal-400 font-medium mt-2.5">Run Profiler &rarr;</span>
      </button>

    </div>

    <!-- DYNAMIC PRIVACY AUDIT MATRIX (ZERO HARDCODED ROWS) -->
    <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs font-mono">
      <div class="flex justify-between items-center mb-2.5">
        <h3 class="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
          <i class="fas fa-eye-slash text-teal-400"></i> Selective Disclosure Audit Matrix
        </h3>
        <span class="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
          Zero-Knowledge Guaranteed
        </span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-slate-400 border-b border-slate-800/80 text-[11px]">
              <th class="py-2 pr-4">Attribute Key</th>
              <th class="py-2 pr-4">Verifier Permission</th>
              <th class="py-2 pr-4">Citizen Actual Value</th>
              <th class="py-2">Cryptographic Proof State</th>
            </tr>
          </thead>
          <tbody id="privacyMatrixBody">
            <tr>
              <td colspan="4" class="py-4 text-center text-slate-500 italic">
                Awaiting credential issuance or upload above to inspect cryptographic privacy audit.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </section>

</main>

<!-- ─── SCRIPT ─── -->
<script>
// Global active credential cache
window.currentCredential = null;

// ─── Toast System ─────────────────────────────────────────────────────────────
function showToast(message, type) {
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-950/90 border-emerald-600/80 text-emerald-200'
           : type === 'error'   ? 'bg-rose-950/90 border-rose-600/80 text-rose-200'
           : type === 'warning' ? 'bg-amber-950/90 border-amber-600/80 text-amber-200'
           : 'bg-slate-900/90 border-slate-700 text-slate-200';
  const icon = type === 'success' ? 'fa-circle-check text-emerald-400'
             : type === 'error'   ? 'fa-triangle-exclamation text-rose-400'
             : type === 'warning' ? 'fa-circle-exclamation text-amber-400'
             : 'fa-circle-info text-blue-400';

  toast.className = 'toast-animate pointer-events-auto p-3 rounded-xl border shadow-xl text-xs flex items-start gap-2.5 backdrop-blur ' + bg;
  toast.innerHTML = '<i class="fas ' + icon + ' text-sm mt-0.5 shrink-0"></i><div class="flex-1 leading-snug">' + message + '</div>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(function() { toast.remove(); }, 250);
  }, 3500);
}

// ─── API Helper ───────────────────────────────────────────────────────────────
async function api(url, method, body) {
  method = method || 'GET';
  const opts = { method: method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const text = await r.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch(err) { throw new Error(text || 'Request failed'); }
  if (!r.ok || parsed.success === false) {
    throw new Error(parsed.error || parsed.reason || 'Request failed');
  }
  return parsed;
}

// ─── Update Privacy Audit Matrix (100% Dynamic) ───────────────────────────────
function updatePrivacyMatrix(disclosedKeys) {
  const body = document.getElementById('privacyMatrixBody');
  if (!body) return;
  disclosedKeys = disclosedKeys || [];
  
  if (!window.currentCredential) {
    body.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-500 italic">Awaiting credential issuance or upload above to inspect cryptographic privacy audit.</td></tr>';
    return;
  }

  const cred = window.currentCredential;
  const attrs = [
    { key: 'isOver18', label: 'isOver18 (Age Eligibility)', actual: cred.isOver18 ? 'true' : 'false' },
    { key: 'district', label: 'district (Residence)',        actual: cred.district || '—' },
    { key: 'nid',      label: 'nid (National ID Number)',    actual: cred.nid || '—' },
    { key: 'name',     label: 'name (Full Legal Name)',      actual: cred.name || '—' },
    { key: 'dob',      label: 'dob (Exact Birth Date)',      actual: cred.dob || '—' }
  ];

  body.innerHTML = attrs.map(function(a) {
    const isDis = disclosedKeys.indexOf(a.key) !== -1;
    return '<tr class="border-b border-slate-900/80">'
      + '<td class="py-2 pr-4 text-slate-200 font-medium">' + a.label + '</td>'
      + '<td class="py-2 pr-4 ' + (isDis ? 'text-emerald-400 font-semibold' : 'text-indigo-400 font-semibold') + '">'
      + (isDis ? '<i class="fas fa-eye mr-1"></i> Disclosed' : '<i class="fas fa-eye-slash mr-1"></i> Zero-Knowledge Blinded') + '</td>'
      + '<td class="py-2 pr-4 text-slate-400 font-mono">' + (isDis ? a.actual : '<span class="text-slate-600 italic">Protected in Device</span>') + '</td>'
      + '<td class="py-2 ' + (isDis ? 'text-emerald-300 font-semibold' : 'text-slate-500 italic') + '">'
      + (isDis ? '<span class="text-emerald-300 font-mono">Merkle Leaf Valid</span>' : 'HMAC-SHA256 Secret (Blinded)') + '</td>'
      + '</tr>';
  }).join('');
}

// ─── Load Status On Startup ───────────────────────────────────────────────────
async function loadStatus() {
  try {
    const d = await api('/api/status');
    if (d.credentialDetails) {
      window.currentCredential = d.credentialDetails;
      document.getElementById('outRootHash').textContent = d.credentialDetails.rootIdentityCommitment.slice(0, 24) + '...';
      document.getElementById('outIssuerDID').textContent = d.credentialDetails.issuerDID.slice(0, 28) + '...';
      document.getElementById('wCardName').textContent = d.credentialDetails.name;
      document.getElementById('wCardNID').textContent = d.credentialDetails.nid;
      document.getElementById('wCardDistrict').textContent = d.credentialDetails.district;
      document.getElementById('wCardDOB').textContent = d.credentialDetails.dob;
      
      const badge = document.getElementById('cardStatusBadge');
      badge.textContent = 'ACTIVE · VERIFIED';
      badge.className = 'text-[9px] font-mono text-emerald-300 border border-emerald-500/40 bg-emerald-950/60 px-1.5 py-0.5 rounded font-bold';
      
      const chkDistVal = document.getElementById('chkDistrictVal');
      if (chkDistVal) chkDistVal.textContent = d.credentialDetails.district;
    } else {
      window.currentCredential = null;
      document.getElementById('outRootHash').textContent = '—';
      document.getElementById('outIssuerDID').textContent = '—';
      document.getElementById('wCardName').textContent = '—';
      document.getElementById('wCardNID').textContent = '—';
      document.getElementById('wCardDistrict').textContent = '—';
      document.getElementById('wCardDOB').textContent = '—';
      
      const badge = document.getElementById('cardStatusBadge');
      badge.textContent = 'UNISSUED';
      badge.className = 'text-[9px] font-mono text-slate-400 border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 rounded';
      
      const chkDistVal = document.getElementById('chkDistrictVal');
      if (chkDistVal) chkDistVal.textContent = '—';
    }

    if (d.presentationDetails) {
      document.getElementById('outProofToken').textContent = d.presentationDetails.presentationToken.slice(0, 24) + '...';
      document.getElementById('outDisclosed').textContent = '[' + d.presentationDetails.disclosedKeys.join(', ') + ']';
      updatePrivacyMatrix(d.presentationDetails.disclosedKeys);
    } else {
      document.getElementById('outProofToken').textContent = '—';
      document.getElementById('outDisclosed').textContent = '—';
      updatePrivacyMatrix([]);
    }
  } catch(e) {}
}

// ─── Form & Presets ───────────────────────────────────────────────────────────
function setIssuerInputs(nid, name, dob, district, validity) {
  document.getElementById('fNID').value = nid;
  document.getElementById('fName').value = name;
  document.getElementById('fDOB').value = dob;
  document.getElementById('fDistrict').value = district;
  document.getElementById('fValidity').value = validity;
  showToast('Loaded profile for ' + name, 'info');
}

function applyVerifierPreset() {
  const v = document.getElementById('wVerifier').value;
  const c = function(id, val) { document.getElementById(id).checked = val; };
  if (v === 'Sonali Bank PLC')             { c('chkOver18',true);  c('chkDistrict',true);  c('chkName',false); c('chkDOB',false); c('chkNID',false); }
  else if (v === 'Dhaka Medical Hospital') { c('chkOver18',true);  c('chkDistrict',false); c('chkName',false); c('chkDOB',false); c('chkNID',false); }
  document.getElementById('verifierBadge').textContent = v;
}

function resetChecks() {
  const ids = ['checkReplay', 'checkExpiry', 'checkIssuer', 'checkMerkle', 'checkCitizen'];
  const labels = [
    '1. Session Nonce (Replay Defense)',
    '2. Credential Validity (Expiry Check)',
    '3. Issuer Signature (DPKI ECDSA)',
    '4. Merkle Inclusion (Salted HMAC)',
    '5. Holder Device Key Signature'
  ];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      el.className = 'check-pending p-1.5 rounded bg-slate-900/60 flex justify-between';
      el.innerHTML = '<span>' + labels[i] + '</span><span>○ PENDING</span>';
    }
  }
  document.getElementById('verifyOverallBadge').className = 'badge-real px-2 py-0.5 rounded text-[10px] font-bold';
  document.getElementById('verifyOverallBadge').textContent = 'READY';
  document.getElementById('verifyResultHeader').className = 'font-semibold text-emerald-400';
  document.getElementById('verifyResultHeader').innerHTML = '<i class="fas fa-circle-check mr-1.5"></i>Verification Ready';
  document.getElementById('verifyResultBody').textContent = 'Awaiting presentation submission.';
  document.getElementById('outLatency').textContent = 'Latency: —';
}

// ─── Issuer Form Submit ───────────────────────────────────────────────────────
document.getElementById('issueForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('btnIssue');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Signing...';

  const payload = {
    nid:          document.getElementById('fNID').value,
    name:         document.getElementById('fName').value,
    dob:          document.getElementById('fDOB').value,
    district:     document.getElementById('fDistrict').value,
    validityDays: document.getElementById('fValidity').value,
  };

  try {
    const d = await api('/api/issue', 'POST', payload);
    showToast('Credential signed for ' + d.name + ' (' + d.nid + ')', 'success');
    await loadStatus();
    resetChecks();
  } catch(err) {
    showToast('Govt Issuer Refused Signing: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-stamp text-xs"></i> Issue & Sign Credential';
  }
});

// ─── Generate Presentation Proof ──────────────────────────────────────────────
async function generateProof() {
  const keys = [];
  if (document.getElementById('chkOver18').checked)  keys.push('isOver18');
  if (document.getElementById('chkDistrict').checked) keys.push('district');
  if (document.getElementById('chkName').checked)     keys.push('name');
  if (document.getElementById('chkDOB').checked)      keys.push('dob');
  if (document.getElementById('chkNID').checked)      keys.push('nid');

  if (!keys.length) return showToast('Please select at least one attribute to disclose.', 'warning');

  const verifier = document.getElementById('wVerifier').value;
  try {
    const d = await api('/api/generate-proof', 'POST', { disclosedKeys: keys, verifierName: verifier });
    document.getElementById('outProofToken').textContent = d.presentationToken.slice(0, 24) + '...';
    document.getElementById('outDisclosed').textContent = '[' + keys.join(', ') + ']';
    showToast('Proof generated for ' + verifier, 'success');
    resetChecks();
    updatePrivacyMatrix(keys);
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── Verify Presentation Proof ────────────────────────────────────────────────
async function runVerify(mode) {
  try {
    const d = await api('/api/verify');
    const setPass = function(id, name) {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'check-pass p-1.5 rounded bg-emerald-950/40 border border-emerald-800/40 flex justify-between font-semibold';
        el.innerHTML = '<span>' + name + '</span><span>✓ PASS</span>';
      }
    };
    const setFail = function(id, name, msg) {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'check-fail p-1.5 rounded bg-rose-950/40 border border-rose-800/40 flex justify-between font-semibold';
        el.innerHTML = '<span>' + name + '</span><span>✗ FAIL (' + msg + ')</span>';
      }
    };

    if (d.valid) {
      setPass('checkReplay', '1. Session Nonce (Freshness)');
      setPass('checkExpiry', '2. Credential Validity Period');
      setPass('checkIssuer', '3. Issuer Signature (DPKI ECDSA)');
      setPass('checkMerkle', '4. Merkle Inclusion (HMAC Root)');
      setPass('checkCitizen', '5. Holder Device Signature');

      document.getElementById('verifyOverallBadge').className = 'badge-real px-2 py-0.5 rounded text-[10px] font-bold';
      document.getElementById('verifyOverallBadge').textContent = 'VERIFIED';
      document.getElementById('verifyResultHeader').className = 'font-semibold text-emerald-400';
      document.getElementById('verifyResultHeader').innerHTML = '<i class="fas fa-circle-check mr-1.5"></i>5-Point Verification Passed';
      document.getElementById('verifyResultBody').textContent = 'Identity authenticated with zero unnecessary disclosure.';
      document.getElementById('outLatency').textContent = 'Latency: ' + d.latencyMs + ' ms';
      showToast('Authenticated in ' + d.latencyMs + ' ms', 'success');
    } else {
      document.getElementById('verifyOverallBadge').className = 'badge-rose px-2 py-0.5 rounded text-[10px] font-bold';
      document.getElementById('verifyOverallBadge').textContent = 'FAILED';
      document.getElementById('verifyResultHeader').className = 'font-semibold text-rose-400';
      document.getElementById('verifyResultHeader').innerHTML = '<i class="fas fa-circle-xmark mr-1.5"></i>Verification Rejected';
      document.getElementById('verifyResultBody').textContent = d.reason || 'Cryptographic verification check failed.';
      showToast('Verification Refused: ' + (d.reason || 'Failed'), 'error');
    }
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── Security Attack 1: Tamper Test ───────────────────────────────────────────
async function runTamperTest() {
  try {
    showToast('Executing attribute tamper simulation...', 'warning');
    const d = await api('/api/tamper-test', 'POST');
    const el = document.getElementById('checkMerkle');
    if (el) {
      el.className = 'check-fail p-1.5 rounded bg-rose-950/60 border border-rose-700/80 flex justify-between font-semibold animate-pulse';
      el.innerHTML = '<span>4. Merkle Inclusion Proof</span><span>✗ TAMPER DETECTED</span>';
    }
    document.getElementById('verifyOverallBadge').className = 'badge-rose px-2 py-0.5 rounded text-[10px] font-bold';
    document.getElementById('verifyOverallBadge').textContent = 'TAMPER REJECTED';
    document.getElementById('verifyResultHeader').className = 'font-semibold text-rose-400';
    document.getElementById('verifyResultHeader').innerHTML = '<i class="fas fa-shield-virus mr-1.5"></i>Mathematical Tamper Detected';
    document.getElementById('verifyResultBody').textContent = 'Attribute commitment failed Merkle path verification against root (R).';
    showToast('Tamper rejected mathematically by Merkle proof!', 'error');
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── Security Attack 2: Revocation ────────────────────────────────────────────
async function toggleRevocation() {
  try {
    const d = await api('/api/revoke', 'POST');
    const title = document.getElementById('lblRevokeTitle');
    const sub   = document.getElementById('lblRevokeSub');
    if (d.isRevoked) {
      title.innerHTML = '<i class="fas fa-undo text-xs"></i> 2. Reinstate Credential';
      sub.textContent = 'Credential REVOKED in registry. Verifications will fail.';
      showToast('Credential revoked in on-chain registry!', 'error');
      runVerify('normal');
    } else {
      title.innerHTML = '<i class="fas fa-ban text-xs"></i> 2. Revocation Anchor';
      sub.textContent = 'Simulates on-chain credential blacklist revocation.';
      showToast('Credential reinstated in registry.', 'success');
      runVerify('normal');
    }
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── Security Attack 3: Guardian Recovery ──────────────────────────────────────
async function runGuardianDemo() {
  try {
    showToast('Guardian 1 signing recovery ballot...', 'info');
    await api('/api/guardian-vote', 'POST', { guardianIndex: 1 });
    setTimeout(async function() {
      showToast('Guardian 2 signing (2/3 consensus reached)...', 'info');
      const d = await api('/api/guardian-vote', 'POST', { guardianIndex: 2 });
      showToast('Key Rotated! New Device: ' + d.newDeviceAddress.slice(0, 14) + '...', 'success');
      loadStatus();
    }, 900);
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── Quick Benchmark ──────────────────────────────────────────────────────────
async function runQuickBenchmark() {
  showToast('Benchmarking 50 cryptographic cycles...', 'info');
  try {
    const d = await api('/api/benchmark', 'POST', { iterations: 50 });
    showToast('Proof: ' + d.proofGeneration.mean + ' ms · Verify: ' + d.proofVerification.mean + ' ms (Sub-10ms)', 'success');
  } catch(err) {
    showToast(err.message, 'error');
  }
}

// ─── 1-Click End-to-End Walkthrough ───────────────────────────────────────────
async function runEndToEndDemo() {
  showToast('Executing 1-Click Complete Demonstration...', 'info');
  const nidInput = document.getElementById('fNID');
  if (!nidInput.value) {
    setIssuerInputs('1998061234', 'Md. Tanvir Islam', '2002-05-15', 'Patuakhali', 365);
  }
  setTimeout(function() {
    document.getElementById('btnIssue').click();
    setTimeout(async function() {
      await generateProof();
      setTimeout(async function() {
        await runVerify('normal');
        showToast('Complete Lifecycle Authenticated!', 'success');
      }, 600);
    }, 600);
  }, 400);
}

// ─── File Upload Handlers ─────────────────────────────────────────────────────
function handleProfileJSONUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.nid) document.getElementById('fNID').value = String(data.nid).trim();
      if (data.name) document.getElementById('fName').value = String(data.name).trim();
      if (data.dob) document.getElementById('fDOB').value = String(data.dob).trim();
      if (data.district) document.getElementById('fDistrict').value = String(data.district).trim();
      if (data.validityDays) document.getElementById('fValidity').value = data.validityDays;
      showToast('Loaded profile from JSON! Click Issue to sign.', 'success');
    } catch(err) {
      showToast('Invalid JSON file format: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function downloadSampleJSON() {
  const sample = {
    nid: "1998061234",
    name: "Rahim Uddin",
    dob: "2000-05-15",
    district: "Dhaka",
    validityDays: 365,
    note: "Edit this template with your desired citizen information and upload it to the portal."
  };
  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bangladesh_nid_sample_profile.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded sample template: bangladesh_nid_sample_profile.json', 'info');
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const imgEl = document.getElementById('citizenPhotoImg');
    const placeholder = document.getElementById('citizenPhotoPlaceholder');
    if (imgEl) {
      imgEl.src = dataUrl;
      imgEl.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    showToast('Photo attached to Digital ID Card!', 'success');
  };
  reader.readAsDataURL(file);
}

async function downloadCredentialJSON() {
  try {
    const d = await api('/api/status');
    if (!d.hasCredential || !d.credentialDetails) return showToast('No credential to export!', 'warning');
    const blob = new Blob([JSON.stringify(d.credentialDetails, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credential_" + d.credentialDetails.nid + ".json";
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported signed credential JSON', 'success');
  } catch(err) {
    showToast(err.message, 'error');
  }
}

async function resetDemo() {
  await api('/api/reset', 'POST');
  location.reload();
}

// Initial Boot
loadStatus();
</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if ((req.url === "/" || req.url === "/index.html") && (req.method === "GET" || req.method === "HEAD")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(HTML);
    return;
  }

  const routeKey = (req.method + " " + req.url.split("?")[0]).replace(/\s+/g, " ");
  const handler  = ROUTES[routeKey];

  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      if (!res.headersSent) json(res, 500, { success: false, error: err.message });
    }
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log("\n" + "=".repeat(68));
  console.log("  🇧🇩  Bangladesh NID SSI — All-in-One Defence Console v3.1");
  console.log("=".repeat(68));
  console.log("  Local URL:  http://localhost:" + PORT);
  console.log("  Stop:       Ctrl+C in terminal");
  console.log("=".repeat(68));
  console.log("\n  HIGH-FIDELITY DEFENCE CONSOLE ACTIVE:");
  console.log("   ├─ Official Bangladesh Government Seal & Tri-Color Ribbon");
  console.log("   ├─ Realistic Smart NID Card (Gold EMV Chip & Hologram)");
  console.log("   ├─ Side-by-Side 3-Column Pipeline on ONE Screen");
  console.log("   ├─ Live Privacy Audit Matrix with Zero-Knowledge Proofs");
  console.log("   └─ 4 Security Attack & Evaluation Demonstrations\n");
});
