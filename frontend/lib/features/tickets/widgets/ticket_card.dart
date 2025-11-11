import 'package:flutter/material.dart';

const EdgeInsets _kCardMargin = EdgeInsets.symmetric(
  horizontal: 20,
  vertical: 5,
);
const EdgeInsets _kCardPadding = EdgeInsets.all(16);
const double _kBorderRadius = 14;
const double _kVerticalSpacing = 5;
const Color _kPrimaryOrange = Color(0xFFE96E2B);
const Color _kDividerColor = Colors.black12;
const Color _kPillTextColor = Colors.white;
const Color _kQrBgColor = Color(0xFFF5F5F5);

class TicketCard extends StatelessWidget {
  const TicketCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: _kCardMargin,
      padding: _kCardPadding,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(_kBorderRadius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          const _TicketHeader(),
          const SizedBox(height: _kVerticalSpacing),
          const _TicketDivider(),
          const SizedBox(height: _kVerticalSpacing),
          const _TicketBody(),
        ],
      ),
    );
  }
}

class _TicketHeader extends StatelessWidget {
  const _TicketHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Image.asset('assets/tt_logo.png', height: 32, fit: BoxFit.contain),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'Servizio Urbano',
              style: TextStyle(
                fontSize: 12,
                color: Colors.black54,
                fontWeight: FontWeight.w400,
              ),
            ),
            Text(
              'TRENTO',
              style: TextStyle(
                fontSize: 14,
                color: Colors.black87,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TicketDivider extends StatelessWidget {
  const _TicketDivider();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Container(height: 1, color: _kDividerColor)),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 6.0),
          child: Text(
            'P.IVA 01807370224',
            style: TextStyle(fontSize: 10, color: Colors.black54),
          ),
        ),
        Expanded(child: Container(height: 1, color: _kDividerColor)),
      ],
    );
  }
}

class _TicketBody extends StatelessWidget {
  const _TicketBody();

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        const Expanded(flex: 4, child: _TicketInfoPanel()),
        const SizedBox(width: 16),
        const Expanded(flex: 2, child: _TicketQrPanel()),
      ],
    );
  }
}

class _TicketInfoPanel extends StatelessWidget {
  const _TicketInfoPanel();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const _InfoPill(text: '70 minuti', isFirst: true),
            const SizedBox(width: 1.5),
            const _InfoPill(text: '€ 1.20', isLast: true, isItalic: true),
          ],
        ),
        const SizedBox(height: _kVerticalSpacing),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.black, width: 1.5),
            borderRadius: BorderRadius.circular(6),
          ),
          alignment: Alignment.center,
          child: const Text(
            'Validate',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}

class _TicketQrPanel extends StatelessWidget {
  const _TicketQrPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
      decoration: BoxDecoration(
        color: _kQrBgColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Column(
        children: [
          Image.asset(
            'assets/ticket_qr.png',
            width: 100,
            height: 100,
            fit: BoxFit.contain,
          ),
          const SizedBox(height: 4),
          const Text(
            'UNUSED',
            style: TextStyle(
              fontSize: 10,
              color: Colors.black87,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({
    required this.text,
    this.isFirst = false,
    this.isLast = false,
    this.isItalic = false,
  });

  final String text;
  final bool isFirst;
  final bool isLast;
  final bool isItalic;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        height: 42,
        decoration: BoxDecoration(
          color: _kPrimaryOrange,
          borderRadius: BorderRadius.only(
            topLeft: isFirst ? const Radius.circular(4) : Radius.zero,
            bottomLeft: isFirst ? const Radius.circular(4) : Radius.zero,
            topRight: isLast ? const Radius.circular(4) : Radius.zero,
            bottomRight: isLast ? const Radius.circular(4) : Radius.zero,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          text,
          style: TextStyle(
            color: _kPillTextColor,
            fontWeight: FontWeight.bold,
            fontStyle: isItalic ? FontStyle.italic : FontStyle.normal,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
