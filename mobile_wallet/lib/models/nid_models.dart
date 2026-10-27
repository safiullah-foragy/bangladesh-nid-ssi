class CitizenData {
  final String nid;
  final String name;
  final String dob;
  final String district;
  final bool isOver18;

  CitizenData({
    required this.nid,
    required this.name,
    required this.dob,
    required this.district,
    required this.isOver18,
  });

  Map<String, dynamic> toJson() => {
        'nid': nid,
        'name': name,
        'dob': dob,
        'district': district,
        'isOver18': isOver18,
      };

  factory CitizenData.fromJson(Map<String, dynamic> json) => CitizenData(
        nid: json['nid']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        dob: json['dob']?.toString() ?? '',
        district: json['district']?.toString() ?? '',
        isOver18: json['isOver18'] == true,
      );
}

class CredentialDetails {
  final String nid;
  final String name;
  final String dob;
  final String district;
  final bool isOver18;
  final String rootIdentityCommitment;
  final String issuerDID;
  final String issuanceDate;
  final String expirationDate;
  final int attributeCount;

  CredentialDetails({
    required this.nid,
    required this.name,
    required this.dob,
    required this.district,
    required this.isOver18,
    required this.rootIdentityCommitment,
    required this.issuerDID,
    required this.issuanceDate,
    required this.expirationDate,
    required this.attributeCount,
  });

  factory CredentialDetails.fromJson(Map<String, dynamic> json) =>
      CredentialDetails(
        nid: json['nid']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        dob: json['dob']?.toString() ?? '',
        district: json['district']?.toString() ?? '',
        isOver18: json['isOver18'] == true,
        rootIdentityCommitment:
            json['rootIdentityCommitment']?.toString() ?? '',
        issuerDID: json['issuerDID']?.toString() ?? '',
        issuanceDate: json['issuanceDate']?.toString() ?? '',
        expirationDate: json['expirationDate']?.toString() ?? '',
        attributeCount: (json['attributeCount'] as num?)?.toInt() ?? 5,
      );
}

class PresentationResult {
  final bool success;
  final String presentationToken;
  final List<String> disclosedKeys;
  final List<String> hiddenKeys;
  final String citizenDID;
  final String challenge;
  final String generatedAt;

  PresentationResult({
    required this.success,
    required this.presentationToken,
    required this.disclosedKeys,
    required this.hiddenKeys,
    required this.citizenDID,
    required this.challenge,
    required this.generatedAt,
  });

  factory PresentationResult.fromJson(Map<String, dynamic> json) =>
      PresentationResult(
        success: json['success'] == true,
        presentationToken: json['presentationToken']?.toString() ?? '',
        disclosedKeys: (json['disclosedKeys'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        hiddenKeys: (json['hiddenKeys'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        citizenDID: json['citizenDID']?.toString() ?? '',
        challenge: json['challenge']?.toString() ?? '',
        generatedAt: json['generatedAt']?.toString() ?? '',
      );
}

class VerificationResult {
  final bool valid;
  final String? reason;
  final Map<String, dynamic> checks;
  final Map<String, dynamic> disclosed;
  final double latencyMs;

  VerificationResult({
    required this.valid,
    this.reason,
    required this.checks,
    required this.disclosed,
    required this.latencyMs,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) =>
      VerificationResult(
        valid: json['valid'] == true,
        reason: json['reason']?.toString(),
        checks: (json['checks'] as Map<String, dynamic>?) ?? {},
        disclosed: (json['disclosed'] as Map<String, dynamic>?) ?? {},
        latencyMs: (json['latencyMs'] as num?)?.toDouble() ?? 0.0,
      );
}
