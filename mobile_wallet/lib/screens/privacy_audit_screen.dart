import 'package:flutter/material.dart';

class PrivacyAuditScreen extends StatelessWidget {
  const PrivacyAuditScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 22.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.verified_user_rounded, size: 13, color: Color(0xFF34D399)),
                SizedBox(width: 5),
                Text(
                  'ZERO-KNOWLEDGE PRIVACY',
                  style: TextStyle(
                    color: Color(0xFF34D399),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Privacy & Security Matrix',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Cryptographic proof guarantees protecting citizen data.',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
          ),

          const SizedBox(height: 20),

          // 2x2 Quick Stats Grid
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.shield_rounded,
                  iconColor: const Color(0xFF38BDF8),
                  label: 'Entropy Space',
                  value: '2²⁵⁶',
                  status: 'Immune to Brute-Force',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.link_off_rounded,
                  iconColor: const Color(0xFFC084FC),
                  label: 'Linkability',
                  value: '0%',
                  status: 'Zero Tracking',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.hub_rounded,
                  iconColor: const Color(0xFFFBBF24),
                  label: 'Trust Anchor',
                  value: 'DPKI',
                  status: 'On-Chain Registry',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricTile(
                  icon: Icons.lock_outline_rounded,
                  iconColor: const Color(0xFF34D399),
                  label: 'PII On-Chain',
                  value: '0 Bytes',
                  status: '100% Private',
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 1. Rainbow Table Immunity Card
          _buildCard(
            title: '1. Brute-Force Immunity',
            subtitle: 'Salted commitments eliminate rainbow tables',
            icon: Icons.enhanced_encryption_rounded,
            iconColor: const Color(0xFF38BDF8),
            child: Column(
              children: [
                // Flawed Design
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.close_rounded, color: Colors.redAccent, size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Plain Hash SHA256(NID)',
                              style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Space: 10¹⁷ • Vulnerable to GPU lookup tables',
                              style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Insecure', style: TextStyle(color: Colors.redAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),

                // Our Solution
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_rounded, color: Color(0xFF34D399), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Salted HMAC Commitment',
                              style: TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Space: 2²⁵⁶ (~1.15 × 10⁷⁷) • Computationally secure',
                              style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Secure', style: TextStyle(color: Color(0xFF34D399), fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Cross-Service Unlinkability Card
          _buildCard(
            title: '2. Cross-Service Unlinkability',
            subtitle: 'Different services receive non-correlatable tokens',
            icon: Icons.link_off_rounded,
            iconColor: const Color(0xFFC084FC),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Token Visual Comparison
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    children: [
                      _buildTokenRow('Sonali Bank PLC:', 'Token_A = HMAC(Nonce_1, R || Bank)'),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 6.0),
                        child: Row(
                          children: [
                            Expanded(child: Divider(color: Colors.white12)),
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8.0),
                              child: Text('≠  DO NOT MATCH', style: TextStyle(color: Color(0xFFF43F5E), fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                            Expanded(child: Divider(color: Colors.white12)),
                          ],
                        ),
                      ),
                      _buildTokenRow('Hospital Clinic:', 'Token_B = HMAC(Nonce_2, R || Hosp)'),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Even if both verifiers exchange records, correlation probability is mathematically zero.',
                  style: TextStyle(color: Colors.grey, fontSize: 11),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Decentralized Trust Anchor Card
          _buildCard(
            title: '3. Decentralized Trust (DPKI)',
            subtitle: 'Offline verification with on-chain trust anchor',
            icon: Icons.account_balance_rounded,
            iconColor: const Color(0xFFFBBF24),
            child: Column(
              children: [
                _buildCheckPoint('Offline Verification', 'Verifiers check signatures without querying central govt servers.'),
                const SizedBox(height: 8),
                _buildCheckPoint('Zero Surveillance', 'Government cannot track where or when citizens authenticate.'),
                const SizedBox(height: 8),
                _buildCheckPoint('Instant Revocation', 'Only anonymous Merkle Root hash (R) is revoked on-chain.'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required String status,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              Icon(icon, size: 16, color: iconColor),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(status, style: TextStyle(color: iconColor, fontSize: 9, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: iconColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildTokenRow(String label, String formula) {
    return Row(
      children: [
        SizedBox(
          width: 105,
          child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.w600)),
        ),
        Expanded(
          child: Text(
            formula,
            style: const TextStyle(color: Color(0xFF67E8F9), fontSize: 10, fontFamily: 'monospace'),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildCheckPoint(String boldText, String detailText) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_outline_rounded, size: 15, color: Color(0xFF34D399)),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 11, color: Colors.white),
              children: [
                TextSpan(text: '$boldText: ', style: const TextStyle(fontWeight: FontWeight.bold)),
                TextSpan(text: detailText, style: TextStyle(color: Colors.grey.shade400)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
