import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:aurabus/routing/router.dart';

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goRouter = ref.watch(goRouterProvider);

    return MaterialApp.router(
      title: 'AuraBus',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF8F8F8),
        colorScheme: const ColorScheme.light(
          primary: Colors.black,
          onPrimary: Colors.white,
          surface: Colors.white,
          onSurface: Colors.black,
          secondary: Color(0xFF808080),
          onSecondary: Colors.white,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFFF8F8F8),
          selectedItemColor: Colors.black,
          unselectedItemColor: Color(0xFFA6A6A6),
        ),
      ),
      routerConfig: goRouter,
    );
  }
}
