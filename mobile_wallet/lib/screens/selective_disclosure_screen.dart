import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/nid_models.dart';
import '../services/api_service.dart';
import '../widgets/verification_checklist.dart';

class SelectiveDisclosureScreen extends StatefulWidget {
  final ApiService apiService;

  const SelectiveDisclosureScreen({
    super.key,
    required this.apiService,
  });

  @override
  State<SelectiveDisclosureScreen> createState() =>
      _SelectiveDisclosureScreenState();
}

class _SelectiveDisclosureScreenState
    extends State<SelectiveDisclosureScreen> {
  String _selectedVerifier = 'Sonali Bank PLC (Bank Account KYC)';
  final List<String> _verifiers = [
    'Sonali Bank PLC (Bank Account KYC)',
    'Dhaka Medical College Hospital (Patient Triage)',
    'bKash MFS (Agent Registration)',
    'Bangladesh Election Commission (Voter Auth)',
    'Custom Relying Party Verifier',
  ];

  // Selective Disclosure Attribute Toggles
  final Map<String, bool> _attributeToggles = {
    'isOver18': true,  // Default: Prove age only
    'district': true,  // Default: Prove district
    'name': false,      // Keep hidden
    'dob': false,       // Keep hidden
    'nid': false,       // Keep hidden (NO plain NID leaked!)
  };

  final Map<String, String> _attributeLabels = {
    'isOver18': 'Age Verification (Over 18 Proof)',
    'district': 'District of Residence',
    'name': 'Full Legal Name',
    'dob': 'Exact Date of Birth',
    'nid': '10/17-Digit NID Number',
  };

  final Map<String, String> _attributeSubtitles = {
    'isOver18': 'Zero-Knowledge: Proves adult status without revealing DOB',
    'district': 'Proves electoral/residence jurisdiction',
    'name': 'Discloses citizen legal name to verifier',
    'dob': 'Discloses exact date of birth',
    'nid': 'Direct national identity identifier',
  };

  bool _isGenerating = false;
  bool _isVerifying = false;
  String? _errorMessage;
  PresentationResult? _presentation;
  VerificationResult? _verificationResult;

  Future<void> _generateProof() async {
    final disclosed = _attributeToggles.entries
        .where((e) => e.value)
        .map((e) => e.key)
        .toList();

    if (disclosed.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one attribute to disclose.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    setState(() {
      _isGenerating = true;
      _errorMessage = null;
      _verificationResult = null;
    });

    try {
      final verifierClean = _selectedVerifier.split('(')[0].trim();
      final pres = await widget.apiService.generateProof(
        disclosedKeys: disclosed,
        verifierName: verifierClean,
      );

      setState(() {
        _presentation = pres;
        _isGenerating = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception:', '').trim();
        _isGenerating = false;
      });
    }
  }

  Future<void> _verifyProof() async {
    setState(() {
      _isVerifying = true;
    });

    try {
      final res = await widget.apiService.verifyPresentation();
      setState(() {
        _verificationResult = res;
        _isVerifying = false;
      });
    } catch (e) {
      setState(() {
        _isVerifying = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Verification error: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Screen Title & Description
          const Text(
            'SELECTIVE DISCLOSURE PROOFS',
            style: TextStyle(
              color: Color(0xFF10B981),
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Citizen-Controlled Privacy',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Select which attributes you want to disclose. Unchecked attributes remain mathematically hidden using salted HMAC commitments.',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
          ),

          const SizedBox(height: 20),

          // Verifier Selection
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
                const Text(
                  '1. SELECT RELYING PARTY (VERIFIER):',
                  style: TextStyle(
                    color: Color(0xFF67E8F9),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedVerifier,
                  isExpanded: true,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                  ),
                  items: _verifiers.map((v) {
                    return DropdownMenuItem(
                      value: v,
                      child: Text(
                        v,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedVerifier = val;
                      });
                    }
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Attributes Checkboxes
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
                const Text(
                  '2. CHOOSE ATTRIBUTES TO DISCLOSE:',
                  style: TextStyle(
                    color: Color(0xFF67E8F9),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),

                ..._attributeToggles.keys.map((key) {
                  final isChecked = _attributeToggles[key]!;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: isChecked
                          ? const Color(0xFF10B981).withOpacity(0.08)
                          : const Color(0xFF1E293B).withOpacity(0.5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isChecked
                            ? const Color(0xFF10B981).withOpacity(0.4)
                            : Colors.white.withOpacity(0.05),
                      ),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      child: CheckboxListTile(
                        value: isChecked,
                        activeColor: const Color(0xFF10B981),
                        title: Text(
                          _attributeLabels[key]!,
                          style: TextStyle(
                            color: isChecked ? Colors.white : Colors.grey.shade400,
                            fontSize: 13,
                            fontWeight:
                                isChecked ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                        subtitle: Text(
                          _attributeSubtitles[key]!,
                          style: TextStyle(
                            color: isChecked
                                ? const Color(0xFF34D399).withOpacity(0.8)
                                : Colors.grey.shade600,
                            fontSize: 10,
                          ),
                        ),
                        secondary: Icon(
                          isChecked ? Icons.visibility : Icons.visibility_off,
                          color: isChecked
                              ? const Color(0xFF34D399)
                              : Colors.grey.shade600,
                          size: 20,
                        ),
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                        onChanged: (val) {
                          setState(() {
                            _attributeToggles[key] = val ?? false;
                          });
                        },
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 16),

          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.redAccent, fontSize: 12),
              ),
            ),

          // Generate Proof Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              icon: _isGenerating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.qr_code_2, size: 22),
              label: Text(
                _isGenerating
                    ? 'Calculating HMAC Commitments...'
                    : 'Generate Presentation Proof & QR',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              onPressed: _isGenerating ? null : _generateProof,
            ),
          ),

          // Presentation QR Code & Verification Results Section
          if (_presentation != null) ...[
            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: const Color(0xFF10B981).withOpacity(0.4),
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  const Text(
                    'PRESENSATION TOKEN QR CODE',
                    style: TextStyle(
                      color: Color(0xFF34D399),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Present this QR Code to ${_selectedVerifier.split('(')[0].trim()}',
                    style:
                        TextStyle(color: Colors.grey.shade400, fontSize: 11),
                  ),
                  const SizedBox(height: 16),

                  // White QR Code Container
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: QrImageView(
                      data: _presentation!.presentationToken,
                      version: QrVersions.auto,
                      size: 200.0,
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Presentation Token & Copy
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(
                          text: _presentation!.presentationToken));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Presentation Token copied!'),
                          duration: Duration(seconds: 1),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'BLINDED TOKEN (Tv):',
                                  style: TextStyle(
                                    color: Colors.grey,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _presentation!.presentationToken,
                                  style: const TextStyle(
                                    color: Color(0xFF67E8F9),
                                    fontSize: 10,
                                    fontFamily: 'monospace',
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.copy,
                              size: 16, color: Color(0xFF67E8F9)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Button to Trigger Test Verification
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: _isVerifying
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.verified_user, size: 18),
                      label: Text(
                        _isVerifying
                            ? 'Verifying against DPKI...'
                            : 'Test Relying Party Verification',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      onPressed: _isVerifying ? null : _verifyProof,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Live Checklist Result
            VerificationChecklistWidget(
              result: _verificationResult,
              isLoading: _isVerifying,
            ),
          ],
        ],
      ),
    );
  }
}
