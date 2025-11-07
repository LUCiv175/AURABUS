import 'package:flutter/material.dart';
import 'package:aurabus/features/home/presentation/home_page.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AuraBus',
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF8F8F8),
        colorScheme: const ColorScheme.light(
          primary: Colors.black,
          surface: Colors.white,
          secondary: Color(0xFF808080),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFFF8F8F8),
          selectedItemColor: Colors.black,
          unselectedItemColor: Color(0xFFA6A6A6),
        ),
      ),
      home: const HomePage(),
    );
  }
}
