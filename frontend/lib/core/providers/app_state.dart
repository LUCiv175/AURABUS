import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:aurabus/core/models/stop_data.dart';

final mapStyleProvider = FutureProvider<String?>((ref) async {
  try {
    final style = await rootBundle.loadString('assets/map_style.json');
    debugPrint("Style loaded successfully.");
    return style;
  } catch (e) {
    debugPrint("Error loading style: $e");
    return null;
  }
});

final markersProvider = FutureProvider<Set<Marker>>((ref) async {
  try {
    final jsonString = await rootBundle.loadString('assets/stop_data.json');
    final List<dynamic> stopsJson = json.decode(jsonString);
    final Set<Marker> newMarkers = {};

    for (var stopJson in stopsJson) {
      final stop = StopData.fromJson(stopJson);
      final marker = Marker(
        markerId: MarkerId(stop.stopId.toString()),
        position: LatLng(stop.stopLat, stop.stopLon),
        infoWindow: InfoWindow(
          title: stop.stopName,
          snippet:
              'Linee: ${stop.routes.map((r) => r.routeShortName).join(', ')}',
        ),
      );
      newMarkers.add(marker);
    }
    debugPrint("Markers loaded successfully: ${newMarkers.length}");
    return newMarkers;
  } catch (e) {
    debugPrint("🚨 ERROR loading/parsing markers: $e");
    rethrow;
  }
});

final appIsReadyProvider = Provider<AsyncValue<void>>((ref) {
  final mapStyle = ref.watch(mapStyleProvider);
  final markers = ref.watch(markersProvider);

  if (mapStyle.isLoading || markers.isLoading) {
    return const AsyncValue.loading();
  }

  if (mapStyle.hasError || markers.hasError) {
    return AsyncValue.error(
      'Unable to load initial assets.',
      StackTrace.current,
    );
  }

  return const AsyncValue.data(null);
});
