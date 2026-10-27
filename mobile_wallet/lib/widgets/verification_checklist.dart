import 'package:flutter/material.dart';
import '../models/nid_models.dart';

class VerificationChecklistWidget extends StatelessWidget {
  final VerificationResult? result;
  final bool isLoading;

  const VerificationChecklistWidget({
    super.key,
    required this.result,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Color(0xFF10B981)),
              SizedBox(height: 12),
              Text(
                'Cryptographically verifying presentation against on-chain DPKI...',
                style: TextStyle(color: Colors.grey, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    if (result == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: const Center(
          child: Text(
            'No presentation has been verified yet.\nGenerate a proof above and tap "Verify Presentation".',
            style: TextStyle(color: Colors.grey, fontSize: 12),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    final res = result!;
    final checks = res.checks;

    final checkItems = [
      {
        'title': 'Session Challenge Matching (Nv)',
        'subtitle': 'Zero-knowledge verifier blinding prevents replay attacks',
        'passed': checks['sessionChallenge'] == true,
      },
      {
        'title': 'Credential Validity & Expiry',
        'subtitle': 'Verified not expired and not revoked in registry',
        'passed': checks['credentialExpiry'] == true,
      },
      {
        'title': 'Government Issuer Digital Signature',
        'subtitle': 'ECDSA signature validated against on-chain DPKI Trust Anchor',
        'passed': checks['issuerSignature'] == true,
      },
      {
        'title': 'Salted HMAC Merkle Proofs (Ci)',
        'subtitle': 'Mathematical commitment reconstruction matched Root Hash (R)',
        'passed': checks['merkleProofs'] == true,
      },
      {
        'title': 'Citizen Device Active Signature',
        'subtitle': 'Proves wallet ownership of the presentation',
        'passed': checks['citizenSignature'] == true,
      },
    ];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: res.valid
              ? const Color(0xFF10B981).withOpacity(0.4)
              : Colors.redAccent.withOpacity(0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Status Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: res.valid
                      ? const Color(0xFF10B981).withOpacity(0.15)
                      : Colors.redAccent.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  res.valid ? Icons.check_circle : Icons.cancel,
                  color: res.valid
                      ? const Color(0xFF34D399)
                      : Colors.redAccent,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      res.valid
                          ? 'VERIFICATION PASSED (বৈধ)'
                          : 'VERIFICATION FAILED (অবৈধ)',
                      style: TextStyle(
                        color: res.valid
                            ? const Color(0xFF34D399)
                            : Colors.redAccent,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      'Latency: ${res.latencyMs.toStringAsFixed(2)} ms',
                      style: TextStyle(
                        color: Colors.grey.shade400,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(color: Colors.white12),
          const SizedBox(height: 8),

          // 5-Point Checklist
          ...checkItems.map((item) {
            final isPassed = item['passed'] as bool;
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 6.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isPassed ? Icons.check_circle_outline : Icons.highlight_off,
                    size: 18,
                    color: isPassed
                        ? const Color(0xFF34D399)
                        : Colors.redAccent,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['title'] as String,
                          style: TextStyle(
                            color: isPassed
                                ? Colors.white
                                : Colors.red.shade300,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          item['subtitle'] as String,
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),

          // Disclosed Attributes Summary
          if (res.disclosed.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(color: Colors.white12),
            const SizedBox(height: 8),
            const Text(
              'DISCLOSED ATTRIBUTES VERIFIED BY RELYING PARTY:',
              style: TextStyle(
                color: Color(0xFF67E8F9),
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: res.disclosed.entries.map((entry) {
                final val = entry.value is Map
                    ? (entry.value as Map)['value']
                    : entry.value;
                return Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: const Color(0xFF38BDF8).withOpacity(0.3),
                    ),
                  ),
                  child: Text(
                    '${entry.key}: $val',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}
