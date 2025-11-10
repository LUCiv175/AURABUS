import 'package:flutter/material.dart';
import 'package:aurabus/features/tickets/widgets/ticket_card.dart';

class TicketPage extends StatelessWidget {
  const TicketPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F8F8),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              const SizedBox(height: 30),
              const Text(
                'Your Tickets',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              const TicketCard(),
              const SizedBox(height: 20),
              const TicketCard(),
              const SizedBox(height: 20),
              const TicketCard(),
            ],
          ),
        ),
      ),
    );
  }
}
