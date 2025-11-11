import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:aurabus/app.dart';
import 'package:aurabus/core/providers/app_state.dart';
import 'package:aurabus/features/account/presentation/account_page.dart';
import 'package:aurabus/features/tickets/presentation/ticket_page.dart';

void setupMockGoogleMaps() {
  TestWidgetsFlutterBinding.ensureInitialized();

  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(
    const MethodChannel('plugins.flutter.io/google_maps_flutter'),
    (MethodCall methodCall) async {
      switch (methodCall.method) {
        case 'maps#waitForMap':
        case 'maps#update':
        case 'camera#animate':
        case 'markers#update':
          return null;
        default:
          return null;
      }
    },
  );
}

void main() {
  setUpAll(() {
    setupMockGoogleMaps();
  });
  group('Loading Tests and Initial State', () {
    testWidgets(
        'Show CircularProgressIndicator while providers are loading',
        (WidgetTester tester) async {
      final loadingCompleter = Completer<String?>();
      final markersCompleter = Completer<Set<Marker>>();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            mapStyleProvider.overrideWith((ref) => loadingCompleter.future),
            markersProvider.overrideWith((ref) => markersCompleter.future),
          ],
          child: const MyApp(),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      expect(find.byType(GoogleMap), findsNothing);
    });

    testWidgets('Show GoogleMap when providers load successfully',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            mapStyleProvider.overrideWith((ref) => Future.value('{}')),
            markersProvider
                .overrideWith((ref) => Future.value(const <Marker>{})),
          ],
          child: const MyApp(),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(CircularProgressIndicator), findsNothing);

      expect(find.byType(GoogleMap), findsOneWidget);

      final BottomNavigationBar navBar =
          tester.widget(find.byType(BottomNavigationBar));
      expect(navBar.currentIndex, 1);
    });

    testWidgets('Show error message if a provider fails',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            mapStyleProvider.overrideWith((ref) => Future.value('{}')),
            markersProvider
                .overrideWith((ref) => Future.error('Errore di test')),
          ],
          child: const MyApp(),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(CircularProgressIndicator), findsNothing);

      expect(find.byType(GoogleMap), findsNothing);

      expect(find.textContaining('Loading Error:'), findsOneWidget);
      expect(find.textContaining('Test Error'), findsOneWidget);
    });
  });

  group('Test di Navigazione', () {
    Future<void> pumpApp(WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            mapStyleProvider.overrideWith((ref) => Future.value('{}')),
            markersProvider
                .overrideWith((ref) => Future.value(const <Marker>{})),
          ],
          child: const MyApp(),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets(
        'La navigazione tramite BottomNavigationBar aggiorna la pagina e lo stato della barra',
        (WidgetTester tester) async {
      await pumpApp(tester);

      expect(find.byType(GoogleMap), findsOneWidget);
      expect(
          tester
              .widget<BottomNavigationBar>(find.byType(BottomNavigationBar))
              .currentIndex,
          1);

      await tester.tap(find.byIcon(Icons.airplane_ticket));
      await tester.pumpAndSettle();

      expect(find.byType(TicketPage), findsOneWidget);
      expect(find.text('Your Tickets'), findsOneWidget);
      expect(find.byType(GoogleMap), findsNothing);
      expect(
          tester
              .widget<BottomNavigationBar>(find.byType(BottomNavigationBar))
              .currentIndex,
          0); 

      await tester.tap(find.byIcon(Icons.account_circle));
      await tester.pumpAndSettle();

      expect(find.byType(AccountPage), findsOneWidget);
      expect(find.text('Account Settings'), findsOneWidget);
      expect(find.byType(TicketPage), findsNothing);
      expect(
          tester
              .widget<BottomNavigationBar>(find.byType(BottomNavigationBar))
              .currentIndex,
          2);

      await tester.tap(find.byIcon(Icons.home));
      await tester.pumpAndSettle();

      expect(find.byType(GoogleMap), findsOneWidget);
      expect(find.byType(AccountPage), findsNothing);
      expect(
          tester
              .widget<BottomNavigationBar>(find.byType(BottomNavigationBar))
              .currentIndex,
          1);
    });

    testWidgets('The Sections of the Account Page Expand on Tap',
        (WidgetTester tester) async {
      await pumpApp(tester);
      await tester.tap(find.byIcon(Icons.account_circle));
      await tester.pumpAndSettle();

      final finderAccountInfo = find.text('Account Info');
      expect(finderAccountInfo, findsOneWidget);

      expect(find.text('Bus Notifications'), findsNothing);

      await tester.tap(finderAccountInfo);
      await tester.pumpAndSettle();

      expect(find.text('Bus Notifications'), findsOneWidget);

      await tester.tap(finderAccountInfo);
      await tester.pumpAndSettle();

      expect(find.text('Bus Notifications'), findsNothing);
    });
  });
}