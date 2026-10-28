import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// The browser demo talks to the live server; the Android emulator reaches the PC's localhost via 10.0.2.2.
/// Change the Android value to your deployed (https) server before building a release APK.
const String defaultBaseUrl = kIsWeb ? 'https://business-website-ied4.onrender.com' : 'http://10.0.2.2:5002';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class Enquiry {
  Enquiry({
    required this.id,
    required this.name,
    required this.phone,
    required this.message,
    required this.status,
    required this.createdAt,
    this.email,
  });

  factory Enquiry.fromJson(Map<String, dynamic> j) => Enquiry(
        id: j['id'] as int,
        name: j['name'] as String,
        phone: j['phone'] as String,
        email: j['email'] as String?,
        message: j['message'] as String,
        status: j['status'] as String,
        createdAt: j['created_at'] as String,
      );

  final int id;
  final String name;
  final String phone;
  final String? email;
  final String message;
  final String status;
  final String createdAt;
}

/// Phone number in the form wa.me expects: digits only, with India's 91 added to 10-digit numbers.
String waNumber(String phone) {
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  return digits.length == 10 ? '91$digits' : digits;
}

class Api {
  static String baseUrl = defaultBaseUrl;
  static String? token;
  static String userName = '';

  static Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    baseUrl = p.getString('baseUrl') ?? defaultBaseUrl;
    token = p.getString('token');
    userName = p.getString('userName') ?? '';
  }

  static Future<void> setBaseUrl(String url) async {
    var u = url.trim();
    while (u.endsWith('/')) {
      u = u.substring(0, u.length - 1);
    }
    baseUrl = u.isEmpty ? defaultBaseUrl : u;
    final p = await SharedPreferences.getInstance();
    await p.setString('baseUrl', baseUrl);
  }

  static Future<void> logout() async {
    token = null;
    final p = await SharedPreferences.getInstance();
    await p.remove('token');
  }

  static Future<dynamic> _send(String method, String path, [Object? body]) async {
    final uri = Uri.parse('$baseUrl/api$path');
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    http.Response res;
    try {
      final req = http.Request(method, uri)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await req.send().timeout(const Duration(seconds: 60)));
    } catch (_) {
      throw ApiException('Cannot reach the server. Check your internet or the server address.');
    }
    dynamic data;
    try {
      data = jsonDecode(res.body);
    } catch (_) {
      data = null;
    }
    if (res.statusCode == 401 && token != null) {
      await logout();
      throw ApiException('Session expired. Please login again.');
    }
    if (res.statusCode >= 400) {
      throw ApiException(data is Map && data['error'] is String ? data['error'] as String : 'Something went wrong');
    }
    return data;
  }

  static Future<void> login(String phone, String password) async {
    final d = await _send('POST', '/auth/login', {'phone': phone.trim(), 'password': password}) as Map<String, dynamic>;
    token = d['token'] as String;
    userName = (d['user'] as Map)['name'] as String;
    final p = await SharedPreferences.getInstance();
    await p.setString('token', token!);
    await p.setString('userName', userName);
  }

  static Future<List<Enquiry>> enquiries([String? status]) async {
    final q = (status == null || status.isEmpty) ? '' : '?status=$status';
    final d = await _send('GET', '/enquiries$q') as List;
    return d.map((e) => Enquiry.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> setStatus(int id, String status) => _send('PATCH', '/enquiries/$id', {'status': status});

  static Future<void> delete(int id) => _send('DELETE', '/enquiries/$id');
}
