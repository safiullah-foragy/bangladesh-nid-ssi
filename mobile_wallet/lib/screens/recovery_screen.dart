import 'package:flutter/material.dart';
import '../services/api_service.dart';

class RecoveryScreen extends StatefulWidget {
  final ApiService apiService;

  const RecoveryScreen({super.key, required this.apiService});

  @override
  State<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends State<RecoveryScreen> {
  bool _isLoading = false;
  int _votes = 0;
  bool _g1Voted = false;
  bool _g2Voted = false;
  bool _recoveryExecuted = false;
  String? _newDeviceAddress;

  Future<void> _vote(int guardianIndex) async {
    setState(() {
      _isLoading = true;
    });

    try {
      final res = await widget.apiService.guardianVote(guardianIndex);
      setState(() {
        _g1Voted = res['guardian1Voted'] == true;
        _g2Voted = res['guardian2Voted'] == true;
        _votes = (res['recoveryVotes'] as num?)?.toInt() ?? 0;
        _recoveryExecuted = res['recoveryExecuted'] == true;
        _newDeviceAddress = res['newDeviceAddress']?.toString();
        _isLoading = false;
      });

      if (_recoveryExecuted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 2/3 Consensus Reached! Device Key Rotated!'),
            backgroundColor: Color(0xFF065F46),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Vote failed: $e'),
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
          // Header
          const Text(
            'KEY RECOVERY',
            style: TextStyle(
              color: Color(0xFF10B981),
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Guardian Social Recovery',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Recover identity on new devices via 2-of-3 guardian consensus.',
            style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
          ),

          const SizedBox(height: 20),

          // Progress Box
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: _recoveryExecuted
                    ? const Color(0xFF10B981).withOpacity(0.4)
                    : Colors.white.withOpacity(0.08),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'CONSENSUS STATUS:',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '$_votes / 3 VOTES',
                      style: TextStyle(
                        color: _recoveryExecuted
                            ? const Color(0xFF34D399)
                            : const Color(0xFF38BDF8),
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: _votes / 3.0,
                    minHeight: 8,
                    backgroundColor: const Color(0xFF1E293B),
                    color: _recoveryExecuted
                        ? const Color(0xFF10B981)
                        : const Color(0xFF38BDF8),
                  ),
                ),
                if (_recoveryExecuted) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: const Color(0xFF10B981).withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle,
                                color: Color(0xFF34D399), size: 16),
                            SizedBox(width: 6),
                            Text(
                              'SMART CONTRACT KEY ROTATED!',
                              style: TextStyle(
                                color: Color(0xFF34D399),
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'New Active Device: ${_newDeviceAddress ?? "0x..."}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Guardian 1
          _buildGuardianTile(
            index: 1,
            title: 'Guardian 1: Trusted Family Member',
            subtitle: 'Pre-registered citizen emergency contact',
            hasVoted: _g1Voted,
            onVote: () => _vote(1),
            isEnabled: !_g1Voted && !_isLoading,
          ),

          const SizedBox(height: 12),

          // Guardian 2
          _buildGuardianTile(
            index: 2,
            title: 'Guardian 2: Union Digital Center (UDC)',
            subtitle: 'Authorized government municipal service kiosk',
            hasVoted: _g2Voted,
            onVote: () => _vote(2),
            isEnabled: _g1Voted && !_g2Voted && !_isLoading,
          ),

          const SizedBox(height: 12),

          // Guardian 3
          _buildGuardianTile(
            index: 3,
            title: 'Guardian 3: Election Commission Authority',
            subtitle: 'Notary / DPKI supervisor fallback entity',
            hasVoted: false,
            onVote: () {},
            isEnabled: false,
          ),
        ],
      ),
    );
  }

  Widget _buildGuardianTile({
    required int index,
    required String title,
    required String subtitle,
    required bool hasVoted,
    required VoidCallback onVote,
    required bool isEnabled,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasVoted
              ? const Color(0xFF10B981).withOpacity(0.4)
              : Colors.white.withOpacity(0.08),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: hasVoted
                ? const Color(0xFF10B981).withOpacity(0.2)
                : const Color(0xFF1E293B),
            child: Icon(
              hasVoted ? Icons.check : Icons.security,
              color: hasVoted ? const Color(0xFF34D399) : Colors.grey,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
                ),
              ],
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: hasVoted
                  ? const Color(0xFF10B981)
                  : (isEnabled ? const Color(0xFF0284C7) : Colors.grey.shade800),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: isEnabled ? onVote : null,
            child: Text(
              hasVoted ? 'Voted' : 'Vote',
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
