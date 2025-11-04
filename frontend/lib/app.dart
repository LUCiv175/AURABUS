// lib/app.dart
import 'package:flutter/material.dart';
import 'package:aurabus/features/home/presentation/home_page.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AuraBus',
      theme: ThemeData(
        colorScheme: const ColorScheme(
          brightness: Brightness.light,
          primary: Colors.black,
          onPrimary: Colors.black,
          secondary: Colors.grey,
          onSecondary: Colors.black,
          error: Colors.red,
          onError: Colors.black,
          surface: Colors.grey,
          onSurface: Colors.black,
        ),
      ),
      home: const HomePage(),
    );
  }
}