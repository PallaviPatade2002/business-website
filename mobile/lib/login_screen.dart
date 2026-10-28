import 'package:flutter/material.dart';

import 'api.dart';
import 'home_screen.dart';
import 'main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _server = TextEditingController(text: Api.baseUrl);
  bool _busy = false;
  bool _hide = true;
  String? _error;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    _server.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_phone.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter phone and password');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Api.setBaseUrl(_server.text);
      await Api.login(_phone.text, _password.text);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(fadeRoute(const HomeScreen()));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(28, MediaQuery.of(context).padding.top + 48, 28, 56),
            decoration: const BoxDecoration(
              gradient: kHeaderGradient,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
            ),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutBack,
              builder: (_, t, child) => Opacity(
                opacity: t.clamp(0, 1),
                child: Transform.translate(offset: Offset(0, (1 - t) * 24), child: child),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      gradient: const LinearGradient(colors: [kBrand, kAccent]),
                      boxShadow: [BoxShadow(color: kBrand.withValues(alpha: .5), blurRadius: 24, offset: const Offset(0, 10))],
                    ),
                    child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 34),
                  ),
                  const SizedBox(height: 22),
                  const Text('Enquiry Desk',
                      style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1)),
                  const SizedBox(height: 6),
                  Text('Never miss a customer enquiry.',
                      style: TextStyle(color: Colors.white.withValues(alpha: .75), fontSize: 16)),
                ],
              ),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(labelText: 'Phone', prefixIcon: Icon(Icons.phone_rounded)),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    obscureText: _hide,
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_rounded),
                      suffixIcon: IconButton(
                        icon: Icon(_hide ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                        onPressed: () => setState(() => _hide = !_hide),
                      ),
                    ),
                  ),
                  AnimatedSize(
                    duration: const Duration(milliseconds: 250),
                    child: _error == null
                        ? const SizedBox(width: double.infinity)
                        : Container(
                            margin: const EdgeInsets.only(top: 14),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
                            child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.w600)),
                          ),
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: _busy
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                        : const Text('Login'),
                  ),
                  const SizedBox(height: 8),
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      title: const Text('Server settings', style: TextStyle(fontSize: 14, color: Colors.black54)),
                      children: [
                        TextField(
                          controller: _server,
                          keyboardType: TextInputType.url,
                          decoration: const InputDecoration(labelText: 'Server address', prefixIcon: Icon(Icons.dns_rounded)),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Emulator: http://10.0.2.2:5002 · Live: your https:// server link',
                          style: TextStyle(fontSize: 12, color: Colors.black45),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
