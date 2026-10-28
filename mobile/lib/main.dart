import 'package:flutter/material.dart';

import 'api.dart';
import 'home_screen.dart';
import 'login_screen.dart';

const kBrand = Color(0xFF3B5BFF);
const kAccent = Color(0xFF14B8D4);
const kHeaderGradient = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFF0B1230), Color(0xFF14275C), Color(0xFF0F4C75)],
);

Route<T> fadeRoute<T>(Widget page) => PageRouteBuilder<T>(
      transitionDuration: const Duration(milliseconds: 450),
      pageBuilder: (_, _, _) => page,
      transitionsBuilder: (_, a, _, child) => FadeTransition(
        opacity: CurvedAnimation(parent: a, curve: Curves.easeOut),
        child: child,
      ),
    );

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Api.load();
  runApp(const EnquiryApp());
}

class EnquiryApp extends StatelessWidget {
  const EnquiryApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(seedColor: kBrand, brightness: Brightness.light);
    return MaterialApp(
      title: 'Enquiry Desk',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        scaffoldBackgroundColor: const Color(0xFFF7F9FC),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF1F4FB),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: kBrand, width: 1.6),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
          ),
        ),
      ),
      home: Api.token == null ? const LoginScreen() : const HomeScreen(),
    );
  }
}
