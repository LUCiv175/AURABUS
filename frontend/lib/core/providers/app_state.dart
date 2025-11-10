// lib/core/providers/app_state.dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:aurabus/core/models/StopData.dart';

class MyAppState extends ChangeNotifier {
  String? _mapStyle;
  Set<Marker> _markers = {};
  bool _isLoading = true;
  String? get mapStyle => _mapStyle;
  Set<Marker> get markers => _markers;
  bool get isLoading => _isLoading;

  MyAppState() {
    _loadAllMapData();
  }

  Future<void> _loadAllMapData() async {
    await Future.wait([_loadMapStyle(), _loadMarkers()]);
    _isLoading = false;
    notifyListeners();
  }

  Future<void> _loadMapStyle() async {
    try {
      _mapStyle = await rootBundle.loadString('assets/map_style.json');
      debugPrint("Stile mappa caricato con successo nello Stato.");
    } catch (e) {
      debugPrint("Errore nel caricamento dello stile: $e");
    }
  }

  Future<void> _loadMarkers() async {
    try {
      final jsonString = await rootBundle.loadString('assets/stop_data.json');
      final List<dynamic> stopsJson = json.decode(jsonString);
      final Set<Marker> newMarkers = {};
      final BitmapDescriptor customIcon = await BitmapDescriptor.asset(
        const ImageConfiguration(size: Size(20, 20)),
        'assets/bus_stop_icon.png',
      );

      for (var stopJson in stopsJson) {
        final stop = StopData.fromJson(stopJson);
        final marker = Marker(
          markerId: MarkerId(stop.stopId.toString()),
          position: LatLng(stop.stopLat, stop.stopLon),
          icon: customIcon,
          infoWindow: InfoWindow(
            title: stop.stopName,
            snippet:
                'Linee: ${stop.routes.map((r) => r.routeShortName).join(', ')}',
          ),
        );
        newMarkers.add(marker);
      }
      _markers = newMarkers;
      debugPrint(
        "Marker caricati con successo nello Stato: ${_markers.length}",
      );
    } catch (e) {
      debugPrint("🚨 ERRORE nel caricamento/parsing dei marker: $e");
    }
  }
}
