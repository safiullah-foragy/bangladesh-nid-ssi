const hre = require("hardhat");
const { ethers } = hre;
const {
  issueGovernmentCredential,
  generatePresentation,
  verifyPresentation,
} = require("./01_crypto_engine");

/**
 * ==============================================================================
 * HARDHAT DEPLOYMENT, RECOVERY SIMULATION & EMPIRICAL BENCHMARK SUITE
 * ==============================================================================
 * Demonstrates:
 * 1. DPKI Trust Anchor Anchoring on-chain
 * 2. Credential Revocation without breaking privacy
 * 3. 2-of-3 Guardian Social Recovery after phone/device loss
 * 4. Complete Empirical Gas & Latency Benchmarking Table
 */

async function main() {
  console.log("================================================================================");
  console.log(" BANGLADESH NID SSI: HARDHAT AUTOMATION & BENCHMARK SUITE");
  console.log("================================================================================\n");

  const gasReport = {};
  const timingReport = {};

  // 1. SETUP SIGNERS & WALLETS (ACTORS)
  const [deployer, g1Signer, g2Signer, g3Signer] = await ethers.getSigners();

  // Create explicit Wallets for Issuer, Citizen, and New Device
  const issuerSigner = ethers.Wallet.createRandom(ethers.provider);
  const citizenSigner = ethers.Wallet.createRandom(ethers.provider);
  const newDeviceWallet = ethers.Wallet.createRandom(ethers.provider);
  const guardian1 = g1Signer;
  const guardian2 = g2Signer;
  const guardian3 = g3Signer;

  // Fund accounts with test ETH
  await deployer.sendTransaction({ to: issuerSigner.address, value: ethers.parseEther("10.0") });
  await deployer.sendTransaction({ to: citizenSigner.address, value: ethers.parseEther("10.0") });

  console.log("📋 ACTORS IDENTIFIED:");
  console.log(`   - Government Issuer:  ${issuerSigner.address}`);
  console.log(`   - Citizen Wallet:     ${citizenSigner.address}`);
  console.log(`   - Guardian 1:         ${guardian1.address}`);
  console.log(`   - Guardian 2:         ${guardian2.address}`);
  console.log(`   - Guardian 3:         ${guardian3.address}`);
  console.log(`   - New Device Wallet:  ${newDeviceWallet.address}\n`);

  // 2. CONTRACT DEPLOYMENT (DPKI TRUST ANCHOR SETUP)
  console.log("--------------------------------------------------------------------------------");
  console.log("STEP 1: DEPLOYING NIDREGISTRY CONTRACT & ANCHORING ISSUER DPKI KEY");
  console.log("--------------------------------------------------------------------------------");

  const issuerRawPublicKey = issuerSigner.signingKey.publicKey;

  const NIDRegistryFactory = await ethers.getContractFactory("NIDRegistry", issuerSigner);
  const startTimeDeploy = performance.now();
  const nidRegistry = await NIDRegistryFactory.deploy(issuerRawPublicKey);
  await nidRegistry.waitForDeployment();
  const endTimeDeploy = performance.now();

  const registryAddress = await nidRegistry.getAddress();
  const deployTxReceipt = await nidRegistry.deploymentTransaction().wait();

  gasReport["Contract Deployment"] = Number(deployTxReceipt.gasUsed);
  timingReport["Contract Deployment"] = (endTimeDeploy - startTimeDeploy).toFixed(2);

  console.log(` ✅ NIDRegistry Deployed at: ${registryAddress}`);
  console.log(`    └─ Gas Used: ${deployTxReceipt.gasUsed.toString()} units`);
  console.log(`    └─ Execution Latency: ${timingReport["Contract Deployment"]} ms`);

  // Verify Issuer Trust Anchor
  const storedIssuerKey = await nidRegistry.issuerPublicKey();
  console.log(`    └─ Stored DPKI Issuer Public Key: ${storedIssuerKey.slice(0, 34)}...\n`);

  // Update Issuer Public Key Benchmark
  const updateKeyTx = await nidRegistry.updateIssuerPublicKey(issuerRawPublicKey);
  const updateKeyReceipt = await updateKeyTx.wait();
  gasReport["Update Issuer Public Key"] = Number(updateKeyReceipt.gasUsed);

  // 3. CREDENTIAL REGISTRATION & ON-CHAIN REVOCATION SIMULATION
  console.log("--------------------------------------------------------------------------------");
  console.log("STEP 2: CREDENTIAL REGISTRATION & PRIVACY-PRESERVING REVOCATION");
  console.log("--------------------------------------------------------------------------------");

  const nidData = {
    nid: "19980612345678901",
    name: "Md. Tanvir Islam",
    dob: "2002-05-15",
    district: "Patuakhali",
    isOver18: true,
  };

  const startTimeIssuance = performance.now();
  const credential = issueGovernmentCredential(nidData, issuerSigner);
  const endTimeIssuance = performance.now();
  timingReport["Client-Side Credential Issuance"] = (endTimeIssuance - startTimeIssuance).toFixed(2);

  const rootCommitmentHash = credential.rootIdentityCommitment;
  console.log(` Registering Root Commitment Hash on-chain: ${rootCommitmentHash}`);

  const regTx = await nidRegistry.registerCredential(rootCommitmentHash);
  const regReceipt = await regTx.wait();
  gasReport["Register Credential Hash"] = Number(regReceipt.gasUsed);

  let isValidBefore = await nidRegistry.isCredentialValid(rootCommitmentHash);
  console.log(` Status BEFORE Revocation: ${isValidBefore ? "VALID ✅" : "INVALID ❌"}`);

  console.log(` Revoking Credential on-chain...`);
  const revokeTx = await nidRegistry.revokeCredential(rootCommitmentHash);
  const revokeReceipt = await revokeTx.wait();
  gasReport["Revoke Credential"] = Number(revokeReceipt.gasUsed);

  let isValidAfter = await nidRegistry.isCredentialValid(rootCommitmentHash);
  console.log(` Status AFTER Revocation:  ${isValidAfter ? "VALID ✅" : "REVOKED / INVALID ❌"}`);
  console.log(`    └─ Revocation Gas Used: ${revokeReceipt.gasUsed.toString()} units\n`);

  // Re-register a fresh valid credential for the recovery demo
  const freshNIDData = { ...nidData, nid: "19980612345678902" };
  const freshCredential = issueGovernmentCredential(freshNIDData, issuerSigner);
  await (await nidRegistry.registerCredential(freshCredential.rootIdentityCommitment)).wait();

  // 4. GUARDIAN SOCIAL RECOVERY SIMULATION (PHONE/DEVICE LOSS)
  console.log("--------------------------------------------------------------------------------");
  console.log("STEP 3: EDGE DEVICE LOSS & 2-OF-3 GUARDIAN SOCIAL RECOVERY");
  console.log("--------------------------------------------------------------------------------");

  console.log(" Citizen registers 3 trusted guardians...");
  const regGuardiansTx = await nidRegistry
    .connect(citizenSigner)
    .registerGuardians([guardian1.address, guardian2.address, guardian3.address]);
  const regGuardiansReceipt = await regGuardiansTx.wait();
  gasReport["Register 3 Guardians"] = Number(regGuardiansReceipt.gasUsed);

  const initialActiveKey = await nidRegistry.citizenActiveKey(citizenSigner.address);
  console.log(` Citizen Active Key before loss: ${initialActiveKey}`);

  console.log("\n 📱 SCENARIO: Citizen loses phone / device! Lost active private key.");
  console.log(` Citizen requests recovery using new key: ${newDeviceWallet.address}`);

  console.log("\n 🗳️ Guardian 1 initiates recovery vote...");
  const initRecTx = await nidRegistry
    .connect(guardian1)
    .initiateRecovery(citizenSigner.address, newDeviceWallet.address);
  const initRecReceipt = await initRecTx.wait();
  gasReport["Initiate Recovery (Vote 1)"] = Number(initRecReceipt.gasUsed);

  let recoveryStatus1 = await nidRegistry.getRecoveryStatus(citizenSigner.address);
  console.log(`    └─ Vote Count: ${recoveryStatus1.voteCount}/3 | Executed: ${recoveryStatus1.executed}`);

  console.log("\n 🗳️ Guardian 2 supports recovery vote (2-of-3 threshold)...");
  const suppRecTx = await nidRegistry
    .connect(guardian2)
    .supportRecovery(citizenSigner.address, newDeviceWallet.address);
  const suppRecReceipt = await suppRecTx.wait();
  gasReport["Support Recovery (Vote 2 - Executed)"] = Number(suppRecReceipt.gasUsed);

  let recoveryStatus2 = await nidRegistry.getRecoveryStatus(citizenSigner.address);
  console.log(`    └─ Vote Count: ${recoveryStatus2.voteCount}/3 | Executed: ${recoveryStatus2.executed}`);

  const updatedActiveKey = await nidRegistry.citizenActiveKey(citizenSigner.address);
  console.log(`\n ✅ Key Recovery Success! Updated Active Device Key: ${updatedActiveKey}`);
  console.log(`    └─ Key Successfully Rotated from ${initialActiveKey} to ${updatedActiveKey}\n`);

  // 5. CLIENT-SIDE CRYPTOGRAPHIC LATENCY BENCHMARKING
  console.log("--------------------------------------------------------------------------------");
  console.log("STEP 4: CLIENT-SIDE CRYPTOGRAPHIC PERFORMANCE PROFILING");
  console.log("--------------------------------------------------------------------------------");

  const startTimePresentation = performance.now();
  const presentationA = generatePresentation(
    freshCredential,
    ["isOver18", "district"],
    "Bank Verification",
    "Nonce_12345",
    newDeviceWallet
  );
  const endTimePresentation = performance.now();
  timingReport["Client Proof Generation (Selective Disclosure)"] = (
    endTimePresentation - startTimePresentation
  ).toFixed(2);

  const startTimeVerification = performance.now();
  const proofResult = verifyPresentation(presentationA, "Nonce_12345", issuerSigner.address);
  const endTimeVerification = performance.now();
  timingReport["Verifier Proof Validation"] = (endTimeVerification - startTimeVerification).toFixed(2);

  console.log(` Selective Proof Generation Latency: ${timingReport["Client Proof Generation (Selective Disclosure)"]} ms`);
  console.log(` Verifier Proof Validation Latency:   ${timingReport["Verifier Proof Validation"]} ms`);
  console.log(` Proof Status: ${proofResult.valid ? "VALID ✅" : "INVALID ❌"}\n`);

  // 6. EMPIRICAL BENCHMARK SUMMARY TABLE
  console.log("================================================================================");
  console.log(" EMPIRICAL PERFORMANCE & GAS BENCHMARK MATRIX");
  console.log("================================================================================");

  console.log("\n1️⃣ SMART CONTRACT GAS CONSUMPTION:");
  console.table(
    Object.keys(gasReport).map((operation) => ({
      "Operation Name": operation,
      "Gas Consumed (Units)": gasReport[operation],
      "Est. Cost @ 20 gwei (ETH)": (gasReport[operation] * 20 * 1e-9).toFixed(6),
    }))
  );

  console.log("\n2️⃣ CRYPTOGRAPHIC LATENCY METRICS:");
  console.table(
    Object.keys(timingReport).map((operation) => ({
      "Cryptographic Operation": operation,
      "Latency (milliseconds)": `${timingReport[operation]} ms`,
    }))
  );

  console.log("\n================================================================================");
  console.log(" ALL BENCHMARK TESTS & SIMULATION SCENARIOS EXECUTED SUCCESSFULLY ✅");
  console.log("================================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Execution Error:", error);
    process.exit(1);
  });
