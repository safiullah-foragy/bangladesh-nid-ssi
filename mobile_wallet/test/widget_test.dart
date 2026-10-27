import 'package:flutter_test/flutter_test.dart';
import 'package:citizen_wallet/main.dart';
import 'package:citizen_wallet/services/api_service.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    final apiService = ApiService();
    await tester.pumpWidget(CitizenWalletApp(apiService: apiService));
    expect(find.text('Bangladesh NID SSI'), findsOneWidget);
  });
}
