const readline = require("readline");
const crypto = require("crypto");
const { ethers } = require("ethers");
const {
  issueGovernmentCredential,
  generatePresentation,
  verifyPresentation,
} = require("./01_crypto_engine");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.clear();
  console.log("================================================================================");
  console.log("   🇧🇩 BANGLADESH NID SELF-SOVEREIGN IDENTITY (LIVE DYNAMIC DEMO)   ");
  console.log("================================================================================\n");

  console.log("👉 STEP 1: Enter Citizen's Real / Custom Information:\n");

  const nid = (await askQuestion("1. Enter NID Number (e.g., 19980612345678901): ")).trim() || "19980612345678901";
  const name = (await askQuestion("2. Enter Full Name (e.g., Md. Tanvir Islam): ")).trim() || "Md. Tanvir Islam";
  const dob = (await askQuestion("3. Enter Date of Birth (YYYY-MM-DD, e.g., 2002-05-15): ")).trim() || "2002-05-15";
  const district = (await askQuestion("4. Enter District (e.g., Patuakhali / Dhaka): ")).trim() || "Dhaka";
  
  // Calculate age automatically from DOB
  const birthYear = parseInt(dob.split("-")[0]) || 2000;
  const currentYear = new Date().getFullYear();
  const isOver18 = (currentYear - birthYear) >= 18;

  const citizenData = {
    nid,
    name,
    dob,
    district,
    isOver18,
  };

  console.log("\n--------------------------------------------------------------------------------");
  console.log("📋 CITIZEN DATA RECEIVED:");
  console.log(JSON.stringify(citizenData, null, 2));
  console.log("--------------------------------------------------------------------------------\n");

  // Step 2: Government issues credential
  console.log("🏛️ GOVERNMENT ISSUER IS CREATING SECURE IDENTITY COMMITMENTS...");
  const issuerWallet = ethers.Wallet.createRandom();
  const citizenWallet = ethers.Wallet.createRandom();

  const credential = issueGovernmentCredential(citizenData, issuerWallet);

  console.log("\n✅ Government Signed Root Identity Commitment:");
  console.log(`   Root Hash (R): ${credential.rootIdentityCommitment}\n`);

  // Step 3: Interactive Verifier Selection
  console.log("--------------------------------------------------------------------------------");
  console.log("👉 STEP 2: Choose Who Wants to Verify Your Identity:");
  console.log("  [1] Sonali Bank PLC (Requires: isOver18 + district, Hides: NID, Name, DOB)");
  console.log("  [2] Dhaka Medical College Hospital (Requires ONLY: isOver18, Hides: everything else)");
  console.log("  [3] Custom Selection (You pick exactly which fields to share)");
  
  const choice = (await askQuestion("\nEnter your choice (1, 2, or 3) [Default 1]: ")).trim() || "1";

  let selectedAttributes = ["isOver18", "district"];
  let verifierName = "Sonali Bank PLC";

  if (choice === "2") {
    selectedAttributes = ["isOver18"];
    verifierName = "Dhaka Medical College Hospital";
  } else if (choice === "3") {
    verifierName = "Custom Relying Party";
    selectedAttributes = [];
    console.log("\nSelect attributes to disclose (y/n):");
    if ((await askQuestion("  Disclose NID? (y/N): ")).toLowerCase() === "y") selectedAttributes.push("nid");
    if ((await askQuestion("  Disclose Name? (y/N): ")).toLowerCase() === "y") selectedAttributes.push("name");
    if ((await askQuestion("  Disclose DOB? (y/N): ")).toLowerCase() === "y") selectedAttributes.push("dob");
    if ((await askQuestion("  Disclose District? (y/N): ")).toLowerCase() === "y") selectedAttributes.push("district");
    if ((await askQuestion("  Disclose isOver18? (y/N): ")).toLowerCase() === "y") selectedAttributes.push("isOver18");
    if (selectedAttributes.length === 0) selectedAttributes.push("isOver18");
  }

  // Step 4: Edge device generates presentation proof
  console.log(`\n📱 CITIZEN WALLET GENERATING PROOF FOR: ${verifierName}...`);
  const sessionChallenge = "Nonce_0x" + crypto.randomBytes(8).toString("hex");

  const startTime = performance.now();
  const presentation = generatePresentation(
    credential,
    selectedAttributes,
    verifierName,
    sessionChallenge,
    citizenWallet
  );
  const proofTime = (performance.now() - startTime).toFixed(2);

  console.log(`   ⚡ Proof Generated in: ${proofTime} ms`);
  console.log(`   🔒 Disclosed Fields: [${Object.keys(presentation.disclosedAttributes).join(", ")}]`);
  console.log(`   🛡️ Hidden Fields: [${credential.leafOrder.filter(k => !selectedAttributes.includes(k)).join(", ")}]`);
  console.log(`   🔑 Blinded Session Token: ${presentation.presentationToken.slice(0, 24)}...`);

  // Step 5: Verifier checks proof
  console.log(`\n🏢 ${verifierName.toUpperCase()} VERIFYING PRESENTATION PROOF...`);
  const verifyStart = performance.now();
  const result = verifyPresentation(presentation, sessionChallenge, issuerWallet.address);
  const verifyTime = (performance.now() - verifyStart).toFixed(2);

  console.log("--------------------------------------------------------------------------------");
  if (result.valid) {
    console.log(`🎉 VERIFICATION RESULT: PASSED (SUCCESSFUL & AUTHENTIC) ✅`);
    console.log(`   ⏱️ Verification Time: ${verifyTime} ms`);
    console.log(`   🔍 Verifier Confirmed:`);
    selectedAttributes.forEach(attr => {
      console.log(`      • ${attr}: "${presentation.disclosedAttributes[attr].value}" (Cryptographically Verified Authentic)`);
    });
    console.log(`   🚫 Zero access to hidden fields! (NID, Name, etc. kept completely private)`);
  } else {
    console.log(`❌ VERIFICATION RESULT: FAILED (${result.reason})`);
  }
  console.log("--------------------------------------------------------------------------------\n");

  rl.close();
}

if (require.main === module) {
  main();
}
