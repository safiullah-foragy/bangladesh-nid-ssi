import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/nid_models.dart';

class ApiService {
  static const String defaultUrl = 'https://bangladesh-nid-ssi.onrender.com';
  String baseUrl = defaultUrl;

  ApiService({String? customBaseUrl}) {
    if (customBaseUrl != null && customBaseUrl.isNotEmpty) {
      baseUrl = customBaseUrl;
    }
  }

  void updateBaseUrl(String newUrl) {
    baseUrl = newUrl.replaceAll(RegExp(r'/+$'), '');
  }

  // Health Check
  Future<bool> checkHealth() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/health'))
          .timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // Fetch Wallet and Identity Status
  Future<Map<String, dynamic>> getStatus() async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/status'))
        .timeout(const Duration(seconds: 35)); // Allow wakeup for free tier

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to load status: ${response.statusCode}');
    }
  }

  // Issue Credential
  Future<Map<String, dynamic>> issueCredential(CitizenData citizen) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/api/issue'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(citizen.toJson()),
        )
        .timeout(const Duration(seconds: 35));

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return data;
    } else {
      throw Exception(data['error'] ?? 'Issuance failed');
    }
  }

  // Generate Selective Disclosure Proof
  Future<PresentationResult> generateProof({
    required List<String> disclosedKeys,
    required String verifierName,
  }) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/api/generate-proof'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'disclosedKeys': disclosedKeys,
            'verifierName': verifierName,
          }),
        )
        .timeout(const Duration(seconds: 20));

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode == 200 && data['success'] == true) {
      return PresentationResult.fromJson(data);
    } else {
      throw Exception(data['error'] ?? 'Proof generation failed');
    }
  }

  // Verify Presentation
  Future<VerificationResult> verifyPresentation() async {
    final response = await http
        .get(Uri.parse('$baseUrl/api/verify'))
        .timeout(const Duration(seconds: 20));

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return VerificationResult.fromJson(data);
  }

  // Guardian Vote
  Future<Map<String, dynamic>> guardianVote(int guardianIndex) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/api/guardian-vote'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'guardianIndex': guardianIndex}),
        )
        .timeout(const Duration(seconds: 20));

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Guardian vote failed');
    }
  }

  // Reset Session
  Future<bool> resetSession() async {
    final response = await http
        .post(Uri.parse('$baseUrl/api/reset'))
        .timeout(const Duration(seconds: 20));
    return response.statusCode == 200;
  }
}
