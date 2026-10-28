import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api.dart';
import 'login_screen.dart';
import 'main.dart';

const _statusColors = {
  'new': (Color(0xFFDBEAFE), Color(0xFF1D4ED8)),
  'contacted': (Color(0xFFFEF3C7), Color(0xFFA16207)),
  'done': (Color(0xFFDCFCE7), Color(0xFF15803D)),
};

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Enquiry> _all = [];
  bool _loading = true;
  String? _error;
  String _filter = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final rows = await Api.enquiries();
      if (!mounted) return;
      setState(() {
        _all = rows;
        _error = null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      if (Api.token == null) {
        Navigator.of(context).pushReplacement(fadeRoute(const LoginScreen()));
        return;
      }
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  int _count(String s) => _all.where((e) => e.status == s).length;

  Future<void> _logout() async {
    await Api.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(fadeRoute(const LoginScreen()));
  }

  void _toast(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m), behavior: SnackBarBehavior.floating));

  Future<void> _open(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) _toast('Could not open ${uri.scheme}');
  }

  Future<void> _change(Enquiry e, String status) async {
    Navigator.of(context).pop();
    try {
      await Api.setStatus(e.id, status);
      await _load();
      _toast('Marked as $status');
    } on ApiException catch (x) {
      _toast(x.message);
    }
  }

  Future<void> _remove(Enquiry e) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete enquiry?'),
        content: Text('Remove the enquiry from ${e.name}? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    Navigator.of(context).pop();
    try {
      await Api.delete(e.id);
      await _load();
      _toast('Deleted');
    } on ApiException catch (x) {
      _toast(x.message);
    }
  }

  void _details(Enquiry e) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Text(e.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
              _StatusTag(e.status),
            ]),
            const SizedBox(height: 4),
            Text(e.phone + (e.email == null ? '' : ' · ${e.email}'), style: const TextStyle(color: Colors.black54)),
            Text(e.createdAt, style: const TextStyle(color: Colors.black38, fontSize: 12)),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFFF1F4FB), borderRadius: BorderRadius.circular(16)),
              child: Text(e.message, style: const TextStyle(fontSize: 15.5, height: 1.45)),
            ),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => _open(Uri.parse('tel:${e.phone}')),
                  icon: const Icon(Icons.call_rounded),
                  label: const Text('Call'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.tonalIcon(
                  onPressed: () => _open(Uri.parse('https://wa.me/${waNumber(e.phone)}')),
                  icon: const Icon(Icons.chat_rounded),
                  label: const Text('WhatsApp'),
                ),
              ),
            ]),
            const SizedBox(height: 18),
            const Text('Update status', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              for (final s in ['new', 'contacted', 'done'])
                ChoiceChip(
                  label: Text(s[0].toUpperCase() + s.substring(1)),
                  selected: e.status == s,
                  onSelected: e.status == s ? null : (_) => _change(e, s),
                ),
            ]),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () => _remove(e),
              style: TextButton.styleFrom(foregroundColor: const Color(0xFFDC2626)),
              icon: const Icon(Icons.delete_outline_rounded),
              label: const Text('Delete enquiry'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rows = _filter.isEmpty ? _all : _all.where((e) => e.status == _filter).toList();
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        edgeOffset: 120,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _header()),
            SliverToBoxAdapter(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Row(children: [
                  for (final f in const [('', 'All'), ('new', 'New'), ('contacted', 'Contacted'), ('done', 'Done')])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(f.$2),
                        selected: _filter == f.$1,
                        onSelected: (_) => setState(() => _filter = f.$1),
                      ),
                    ),
                ]),
              ),
            ),
            if (_loading)
              const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator()))
            else if (_error != null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _Message(icon: Icons.wifi_off_rounded, text: _error!, action: 'Try again', onTap: () {
                  setState(() => _loading = true);
                  _load();
                }),
              )
            else if (rows.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: _Message(icon: Icons.inbox_rounded, text: 'No enquiries here yet.'),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                sliver: SliverList.builder(
                  itemCount: rows.length,
                  itemBuilder: (_, i) => _EnquiryCard(key: ValueKey(rows[i].id), e: rows[i], index: i, onTap: () => _details(rows[i])),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      padding: EdgeInsets.fromLTRB(22, MediaQuery.of(context).padding.top + 18, 22, 26),
      decoration: const BoxDecoration(
        gradient: kHeaderGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Hello, ${Api.userName.isEmpty ? 'there' : Api.userName.split(' ').first} 👋',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -.5)),
                Text('Here are your customer enquiries',
                    style: TextStyle(color: Colors.white.withValues(alpha: .72))),
              ]),
            ),
            IconButton(
              tooltip: 'Logout',
              onPressed: _logout,
              icon: const Icon(Icons.logout_rounded, color: Colors.white),
            ),
          ]),
          const SizedBox(height: 20),
          Row(children: [
            _StatCard(label: 'New', value: _count('new'), color: const Color(0xFF93C5FD)),
            const SizedBox(width: 10),
            _StatCard(label: 'Contacted', value: _count('contacted'), color: const Color(0xFFFDE68A)),
            const SizedBox(width: 10),
            _StatCard(label: 'Done', value: _count('done'), color: const Color(0xFF86EFAC)),
          ]),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});
  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withValues(alpha: .18)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: value),
            duration: const Duration(milliseconds: 700),
            builder: (_, v, _) =>
                Text('$v', style: TextStyle(color: color, fontSize: 28, fontWeight: FontWeight.w800, height: 1.1)),
          ),
          Text(label, style: TextStyle(color: Colors.white.withValues(alpha: .75), fontSize: 12.5)),
        ]),
      ),
    );
  }
}

class _EnquiryCard extends StatelessWidget {
  const _EnquiryCard({super.key, required this.e, required this.index, required this.onTap});
  final Enquiry e;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 380 + (index.clamp(0, 8)) * 70),
      curve: Curves.easeOutCubic,
      builder: (_, t, child) => Opacity(opacity: t, child: Transform.translate(offset: Offset(0, (1 - t) * 26), child: child)),
      child: Container(
        margin: const EdgeInsets.only(top: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: const Color(0xFF0F172A).withValues(alpha: .07), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: const Color(0xFFEEF2FF),
                  child: Text(e.name.isEmpty ? '?' : e.name[0].toUpperCase(),
                      style: const TextStyle(color: kBrand, fontWeight: FontWeight.w800, fontSize: 18)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Expanded(child: Text(e.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                      _StatusTag(e.status),
                    ]),
                    const SizedBox(height: 2),
                    Text(e.phone, style: const TextStyle(color: Colors.black54, fontSize: 13)),
                    const SizedBox(height: 8),
                    Text(e.message, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(height: 1.35)),
                  ]),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _StatusTag extends StatelessWidget {
  const _StatusTag(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _statusColors[status] ?? (Colors.grey.shade200, Colors.black54);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Text(status[0].toUpperCase() + status.substring(1),
          style: TextStyle(color: fg, fontSize: 11.5, fontWeight: FontWeight.w700)),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text, this.action, this.onTap});
  final IconData icon;
  final String text;
  final String? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(mainAxisSize: MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 56, color: Colors.black26),
        const SizedBox(height: 12),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
        if (action != null) ...[
          const SizedBox(height: 16),
          FilledButton.tonal(onPressed: onTap, child: Text(action!)),
        ],
      ]),
    );
  }
}
