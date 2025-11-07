// lib/features/home/presentation/home_page.dart
import 'package:flutter/material.dart';
import 'package:aurabus/features/map/presentation/map_screen.dart';
import 'package:aurabus/features/tickets/presentation/ticket_page.dart';
import 'package:aurabus/features/account/presentation/account_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  static const List<Widget> _widgetOptions = <Widget>[
    TicketPage(),
    MapScreen(),
    AccountPage(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: _widgetOptions),

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.airplane_ticket, size: 28),
            label: 'Tickets',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.home, size: 28),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.account_circle, size: 28),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
