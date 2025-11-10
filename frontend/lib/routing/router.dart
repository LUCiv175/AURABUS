import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:aurabus/features/home/presentation/home_page.dart';
import 'package:aurabus/features/map/presentation/map_screen.dart';
import 'package:aurabus/features/tickets/presentation/ticket_page.dart';
import 'package:aurabus/features/account/presentation/account_page.dart';

class AppRoute {
  static const String tickets = '/tickets';
  static const String map = '/map';
  static const String account = '/account';
}

final _shellNavigatorKey = GlobalKey<NavigatorState>();
final _rootNavigatorKey = GlobalKey<NavigatorState>();

final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoute.map,

    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return HomePage(child: child);
        },
        routes: [
          GoRoute(
            path: AppRoute.tickets,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: TicketPage()),
          ),
          GoRoute(
            path: AppRoute.map,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: MapScreen()),
          ),
          GoRoute(
            path: AppRoute.account,
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AccountPage()),
          ),
        ],
      ),
    ],
  );
});
