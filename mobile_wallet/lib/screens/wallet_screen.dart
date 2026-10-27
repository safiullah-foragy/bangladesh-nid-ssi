import 'package:flutter/material.dart';
import '../models/nid_models.dart';
import '../services/api_service.dart';
import '../widgets/smart_nid_card.dart';

class WalletScreen extends StatefulWidget {
  final ApiService apiService;
  final VoidCallback onNavigateToDisclosure;

  const WalletScreen({
    super.key,
    required this.apiService,
    required this.onNavigateToDisclosure,
  });

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  CredentialDetails? _credential;
  String? _citizenDID;
  String? _issuerDID;
  bool _isRevoked = false;

  @override
  void initState() {
    super.initState();
    _loadWalletState();
  }

  Future<void> _loadWalletState() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final status = await widget.apiService.getStatus();
      final credJson = status['credentialDetails'] as Map<String, dynamic>?;

      setState(() {
        if (credJson != null) {
          _credential = CredentialDetails.fromJson(credJson);
        } else {
          _credential = null;
        }
        _citizenDID = status['citizenDID']?.toString();
        _issuerDID = status['issuerDID']?.toString();
        _isRevoked = status['isRevoked'] == true;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isLoading = false;
      });
    }
  }

  void _showIssueDialog() {
    final nidController = TextEditingController(text: '19980612345678901');
    final nameController = TextEditingController(text: 'Md. Tanvir Islam');
    final dobController = TextEditingController(text: '1998-06-12');
    final districtController = TextEditingController(text: 'Dhaka');
    bool isOver18 = true;
    bool isSubmitting = false;
    String? dialogError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          '🏛️ Issue Official NID Credential',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Issuer creates cryptographic commitments & anchors Merkle Root to blockchain.',
                      style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                    ),
                    const SizedBox(height: 18),

                    if (dialogError != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                        ),
                        child: Text(
                          dialogError!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                        ),
                      ),

                    _buildTextField(nidController, 'National ID (NID) Number',
                        hint: '10 or 17 digits'),
                    const SizedBox(height: 12),
                    _buildTextField(nameController, 'Full Legal Name',
                        hint: 'Citizen Name in English'),
                    const SizedBox(height: 12),
                    _buildTextField(dobController, 'Date of Birth (YYYY-MM-DD)',
                        hint: '1998-06-12'),
                    const SizedBox(height: 12),
                    _buildTextField(districtController, 'District / জেলা',
                        hint: 'Dhaka / Patuakhali'),
                    const SizedBox(height: 12),

                    CheckboxListTile(
                      value: isOver18,
                      activeColor: const Color(0xFF10B981),
                      title: const Text('Is Citizen Over 18?',
                          style: TextStyle(color: Colors.white, fontSize: 13)),
                      subtitle: const Text('Used for zero-knowledge age verification',
                          style: TextStyle(color: Colors.grey, fontSize: 11)),
                      contentPadding: EdgeInsets.zero,
                      onChanged: (val) {
                        setModalState(() {
                          isOver18 = val ?? true;
                        });
                      },
                    ),

                    const SizedBox(height: 18),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                setModalState(() {
                                  isSubmitting = true;
                                  dialogError = null;
                                });

                                try {
                                  await widget.apiService.issueCredential(
                                    CitizenData(
                                      nid: nidController.text.trim(),
                                      name: nameController.text.trim(),
                                      dob: dobController.text.trim(),
                                      district: districtController.text.trim(),
                                      isOver18: isOver18,
                                    ),
                                  );
                                  if (!mounted) return;
                                  Navigator.pop(ctx);
                                  _loadWalletState();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('✅ NID Credential Issued & Anchored!'),
                                      backgroundColor: Color(0xFF065F46),
                                    ),
                                  );
                                } catch (e) {
                                  setModalState(() {
                                    dialogError = e.toString().replaceAll('Exception:', '').trim();
                                    isSubmitting = false;
                                  });
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'Sign & Anchor to Blockchain',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {String? hint}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade600, fontSize: 12),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF10B981)),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadWalletState,
      color: const Color(0xFF10B981),
      backgroundColor: const Color(0xFF0F172A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Alert if revoked
            if (_isRevoked)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'WARNING: Credential revoked on blockchain registry. Verifications will be rejected.',
                        style: TextStyle(color: Colors.redAccent, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.amber, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Backend Note: $_errorMessage\n(Pull down to refresh or check Server Settings)',
                        style: const TextStyle(color: Colors.amber, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),

            // Smart Card Widget
            _isLoading
                ? Container(
                    height: 220,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(color: Color(0xFF10B981)),
                    ),
                  )
                : SmartNidCard(
                    credential: _credential,
                    citizenDID: _citizenDID,
                  ),

            const SizedBox(height: 20),

            // Quick Actions Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF065F46),
                      foregroundColor: const Color(0xFF34D399),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: const Color(0xFF10B981).withOpacity(0.4)),
                      ),
                    ),
                    icon: const Icon(Icons.add_card, size: 18),
                    label: const Text('Issue New NID', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: _showIssueDialog,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: const Color(0xFF38BDF8),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: const Color(0xFF38BDF8).withOpacity(0.3)),
                      ),
                    ),
                    icon: const Icon(Icons.qr_code_2, size: 18),
                    label: const Text('Share Proof (QR)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: widget.onNavigateToDisclosure,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Device Key & DID Section
            const Text(
              'EDGE DEVICE IDENTIFIER (DID)',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDIDRow('Citizen DID:', _citizenDID ?? 'Generating...'),
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 12),
                  _buildDIDRow('Trust Anchor (Issuer DID):', _issuerDID ?? 'Anchored On-Chain'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDIDRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
        const SizedBox(height: 4),
        SelectableText(
          value,
          style: const TextStyle(
            color: Color(0xFF38BDF8),
            fontSize: 11,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }
}
