import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:aurabus/routing/router.dart';

class HomePage extends StatelessWidget {
  final Widget child;

  const HomePage({super.key, required this.child});

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith(AppRoute.tickets)) return 0;
    if (location.startsWith(AppRoute.map)) return 1;
    if (location.startsWith(AppRoute.account)) return 2;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go(AppRoute.tickets);
        break;
      case 1:
        context.go(AppRoute.map);
        break;
      case 2:
        context.go(AppRoute.account);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _calculateSelectedIndex(context);

    return Scaffold(
      body: child,

      bottomNavigationBar: BottomNavigationBar(
        currentIndex: selectedIndex,
        onTap: (index) => _onItemTapped(index, context),
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
