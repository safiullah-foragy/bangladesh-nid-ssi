import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/nid_models.dart';

class SmartNidCard extends StatefulWidget {
  final CredentialDetails? credential;
  final String? citizenDID;

  const SmartNidCard({
    super.key,
    required this.credential,
    this.citizenDID,
  });

  @override
  State<SmartNidCard> createState() => _SmartNidCardState();
}

class _SmartNidCardState extends State<SmartNidCard> {
  bool _isNidMasked = true;

  String _formatNid(String nid) {
    if (nid.isEmpty) return '•••• •••• ••••';
    if (_isNidMasked && nid.length >= 8) {
      final lastDigits = nid.substring(nid.length - 4);
      return '•••• •••• •••• $lastDigits';
    }
    // Format in spaced groups
    final buffer = StringBuffer();
    for (int i = 0; i < nid.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(nid[i]);
    }
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    final cred = widget.credential;
    final hasCred = cred != null && cred.nid.isNotEmpty;

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF042F2E), // Rich Bangladesh Deep Green
            Color(0xFF0F172A), // Slate Dark
            Color(0xFF1E1B4B), // Indigo Depth
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0D9488).withOpacity(0.25),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: const Color(0xFF14B8A6).withOpacity(0.35),
          width: 1.5,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          children: [
            // Watermark / Pattern Background
            Positioned(
              right: -30,
              bottom: -30,
              child: Opacity(
                opacity: 0.04,
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                  ),
                ),
              ),
            ),

            // Card Content
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row: Bangladesh Govt. Seals
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // National Flag Icon Badge
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: const Color(0xFF064E3B),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: const Color(0xFF10B981).withOpacity(0.6),
                            width: 1.5,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: const Text('🇧🇩', style: TextStyle(fontSize: 18)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
                              style: TextStyle(
                                color: Color(0xFF34D399),
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              'Government of the People\'s Republic of Bangladesh',
                              style: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 9,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const Text(
                              'NATIONAL SMART IDENTITY CARD / স্মার্ট এনআইডি',
                              style: TextStyle(
                                color: Color(0xFFFCD34D),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // DPKI Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF10B981).withOpacity(0.4),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.shield,
                                size: 11, color: Color(0xFF34D399)),
                            SizedBox(width: 4),
                            Text(
                              'DPKI SECURED',
                              style: TextStyle(
                                color: Color(0xFF34D399),
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Middle Section: Chip + Hologram + Photo + Info
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Photo + Chip Column
                      Column(
                        children: [
                          // Citizen Photo Avatar
                          Container(
                            width: 72,
                            height: 84,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              gradient: const LinearGradient(
                                colors: [Color(0xFF334155), Color(0xFF1E293B)],
                              ),
                              border: Border.all(
                                color: const Color(0xFF64748B),
                                width: 1.5,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: hasCred
                                  ? Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.person,
                                            size: 44,
                                            color: Color(0xFF94A3B8)),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 4, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withOpacity(0.5),
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            cred.isOver18 ? '18+ ADULT' : 'MINOR',
                                            style: const TextStyle(
                                              color: Color(0xFF10B981),
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  : const Icon(Icons.person_outline,
                                      size: 40, color: Colors.grey),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Gold EMV Microchip
                          Container(
                            width: 44,
                            height: 32,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(6),
                              gradient: const LinearGradient(
                                colors: [Color(0xFFFBBF24), Color(0xFFD97706)],
                              ),
                              border: Border.all(
                                color: const Color(0xFF78350F),
                                width: 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.amber.withOpacity(0.3),
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: CustomPaint(
                              painter: _EmvChipPainter(),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(width: 16),

                      // Citizen Identity Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Full Name
                            Text(
                              hasCred ? cred.name : 'Citizen Not Loaded',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.2,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'NAME / নাম',
                              style: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 9,
                                letterSpacing: 0.5,
                              ),
                            ),

                            const SizedBox(height: 10),

                            // NID Number with Toggle
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        hasCred
                                            ? _formatNid(cred.nid)
                                            : '•••• •••• ••••',
                                        style: const TextStyle(
                                          color: Color(0xFF67E8F9),
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 1.2,
                                          fontFamily: 'monospace',
                                        ),
                                      ),
                                      Text(
                                        'NID NO / জাতীয় পরিচয়পত্র নং',
                                        style: TextStyle(
                                          color: Colors.grey.shade400,
                                          fontSize: 9,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (hasCred)
                                  IconButton(
                                    icon: Icon(
                                      _isNidMasked
                                          ? Icons.visibility_outlined
                                          : Icons.visibility_off_outlined,
                                      size: 18,
                                      color: Colors.cyanAccent,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _isNidMasked = !_isNidMasked;
                                      });
                                    },
                                    constraints: const BoxConstraints(),
                                    padding: EdgeInsets.zero,
                                  ),
                              ],
                            ),

                            const SizedBox(height: 10),

                            // DOB & District Row
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        hasCred ? cred.dob : '—',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        'DOB / জন্ম তারিখ',
                                        style: TextStyle(
                                          color: Colors.grey.shade400,
                                          fontSize: 9,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        hasCred ? cred.district : '—',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      Text(
                                        'DISTRICT / জেলা',
                                        style: TextStyle(
                                          color: Colors.grey.shade400,
                                          fontSize: 9,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Divider
                  Container(
                    height: 1,
                    color: Colors.white.withOpacity(0.08),
                  ),

                  const SizedBox(height: 10),

                  // Footer: Merkle Root Hash + Hologram Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Merkle Root Commitment Preview
                      Expanded(
                        child: GestureDetector(
                          onTap: hasCred
                              ? () {
                                  Clipboard.setData(ClipboardData(
                                      text: cred.rootIdentityCommitment));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                          'Root Commitment copied to clipboard'),
                                      duration: Duration(seconds: 1),
                                    ),
                                  );
                                }
                              : null,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'ROOT COMMITMENT (R) — ON-CHAIN TRUST ANCHOR',
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 8,
                                  letterSpacing: 0.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Text(
                                    hasCred &&
                                            cred.rootIdentityCommitment
                                                .length > 20
                                        ? '${cred.rootIdentityCommitment.substring(0, 14)}...${cred.rootIdentityCommitment.substring(cred.rootIdentityCommitment.length - 8)}'
                                        : 'Not registered yet',
                                    style: const TextStyle(
                                      color: Color(0xFF34D399),
                                      fontSize: 10,
                                      fontFamily: 'monospace',
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (hasCred) ...[
                                    const SizedBox(width: 4),
                                    const Icon(Icons.copy,
                                        size: 11, color: Color(0xFF34D399)),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Hologram Seal Widget
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFF818CF8),
                              Color(0xFFC084FC),
                              Color(0xFF38BDF8),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.purple.withOpacity(0.3),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.verified, size: 12, color: Colors.white),
                            SizedBox(width: 3),
                            Text(
                              'ORIGINAL',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Custom Painter for Gold EMV Microchip lines
class _EmvChipPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF78350F)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Horizontal line
    canvas.drawLine(
        Offset(0, size.height * 0.5), Offset(size.width, size.height * 0.5), paint);

    // Left vertical lines
    canvas.drawLine(Offset(size.width * 0.35, 0),
        Offset(size.width * 0.35, size.height), paint);

    // Right vertical lines
    canvas.drawLine(Offset(size.width * 0.65, 0),
        Offset(size.width * 0.65, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
