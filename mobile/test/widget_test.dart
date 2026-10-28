import 'package:business_enquiries/api.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('waNumber adds India code to 10-digit numbers', () {
    expect(waNumber('98765 43210'), '919876543210');
    expect(waNumber('+91 98765-43210'), '919876543210');
  });

  test('Enquiry parses server json', () {
    final e = Enquiry.fromJson({
      'id': 1,
      'name': 'Asha',
      'phone': '9876543210',
      'email': null,
      'message': 'Need a quote',
      'status': 'new',
      'created_at': '2026-10-28 10:00:00',
    });
    expect(e.name, 'Asha');
    expect(e.email, isNull);
    expect(e.status, 'new');
  });
}
