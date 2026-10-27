import 'package:flutter/material.dart';

class PrivacyAuditScreen extends StatelessWidget {
  const PrivacyAuditScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          const Text(
            'SUPERVISOR DEFENSE AUDIT',
            style: TextStyle(
              color: Color(0xFF10B981),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Cryptographic Privacy Matrix',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Formal proofs showing mathematical immunity to linkability, correlation, and rainbow-table brute-force attacks.',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
          ),

          const SizedBox(height: 20),

          // 1. Comparison Card: Plain Hash vs Salted HMAC
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.shield_outlined,
                        color: Color(0xFF38BDF8), size: 20),
                    SizedBox(width: 8),
                    Text(
                      '1. Brute-Force & Rainbow Table Immunity',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Flawed Design Row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border:
                        Border.all(color: Colors.redAccent.withOpacity(0.2)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.close, color: Colors.redAccent, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Flawed Plain Hash: SHA256(NID)',
                            style: TextStyle(
                              color: Colors.redAccent,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Search Space: ~10^17 (17-digit NID)\nRainbow table precomputation can reverse raw NID in minutes on modern GPUs.',
                        style: TextStyle(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Our Solution Row
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: const Color(0xFF10B981).withOpacity(0.3)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check,
                              color: Color(0xFF34D399), size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Our Scheme: Ci = HMAC(Si, Ai)',
                            style: TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Search Space: 2^256 (~1.15 × 10^77)\nCryptographically impossible to reverse or precompute with rainbow tables.',
                        style: TextStyle(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Unlinkability Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.link_off,
                        color: Color(0xFFC084FC), size: 20),
                    SizedBox(width: 8),
                    Text(
                      '2. Cross-Service Unlinkability',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Even if Sonali Bank PLC and Dhaka Medical College Hospital collude and exchange raw presentation tokens, they cannot correlate the citizen because every session uses fresh blinding nonces (Nv) and verifier-bound presentation tokens:',
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                ),
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Tv = HMAC(Nv, R || VerifierID)\nPresentation A (Bank) ≠ Presentation B (Hospital)\nCorrelation probability = 0 (Uniformly random)',
                    style: TextStyle(
                      color: Color(0xFF67E8F9),
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Decentralized Public Key Infrastructure (DPKI)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.account_balance,
                        color: Color(0xFFFBBF24), size: 20),
                    SizedBox(width: 8),
                    Text(
                      '3. DPKI On-Chain Trust Anchor',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '• Relying parties verify credentials offline against the canonical Government Issuer public key registered in NIDRegistry.sol.\n• Zero central government servers are contacted during verification.\n• Eliminates government surveillance of citizen authentication events.',
                  style: TextStyle(color: Colors.grey.shade400, fontSize: 11, height: 1.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
