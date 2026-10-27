import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'wallet_screen.dart';
import 'selective_disclosure_screen.dart';
import 'privacy_audit_screen.dart';
import 'recovery_screen.dart';

class HomeScreen extends StatefulWidget {
  final ApiService apiService;

  const HomeScreen({super.key, required this.apiService});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  void _showServerSettings() {
    final controller = TextEditingController(text: widget.apiService.baseUrl);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          title: const Text(
            '⚙️ Backend Server URL',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Configure the live Render cloud backend or local development API:',
                style: TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  ActionChip(
                    backgroundColor: const Color(0xFF1E293B),
                    label: const Text('Render Cloud', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10)),
                    onPressed: () {
                      controller.text = 'https://bangladesh-nid-ssi.onrender.com';
                    },
                  ),
                  ActionChip(
                    backgroundColor: const Color(0xFF1E293B),
                    label: const Text('Android Emulator', style: TextStyle(color: Color(0xFF34D399), fontSize: 10)),
                    onPressed: () {
                      controller.text = 'http://10.0.2.2:3000';
                    },
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
              onPressed: () {
                setState(() {
                  widget.apiService.updateBaseUrl(controller.text.trim());
                });
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Backend URL set to: ${widget.apiService.baseUrl}'),
                    backgroundColor: const Color(0xFF065F46),
                  ),
                );
              },
              child: const Text('Save', style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      WalletScreen(
        apiService: widget.apiService,
        onNavigateToDisclosure: () {
          setState(() {
            _currentIndex = 1;
          });
        },
      ),
      SelectiveDisclosureScreen(apiService: widget.apiService),
      const PrivacyAuditScreen(),
      RecoveryScreen(apiService: widget.apiService),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: Row(
          children: [
            const Text('🇧🇩', style: TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Bangladesh NID SSI',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Citizen Mobile Identity Wallet',
                  style: TextStyle(
                    color: Colors.grey.shade400,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined, color: Colors.grey, size: 20),
            tooltip: 'Server Settings',
            onPressed: _showServerSettings,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(2.0),
          child: Container(
            height: 2.0,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF059669), Color(0xFFE11D48), Color(0xFFD97706)],
              ),
            ),
          ),
        ),
      ),
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          border: Border(
            top: BorderSide(color: Colors.white.withOpacity(0.08)),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFF10B981),
          unselectedItemColor: const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 10),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.badge_outlined),
              activeIcon: Icon(Icons.badge),
              label: 'Smart NID',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.qr_code_2_outlined),
              activeIcon: Icon(Icons.qr_code_2),
              label: 'Share Proof',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.verified_user_outlined),
              activeIcon: Icon(Icons.verified_user),
              label: 'Privacy Audit',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.security_outlined),
              activeIcon: Icon(Icons.security),
              label: 'Recovery',
            ),
          ],
        ),
      ),
    );
  }
}
