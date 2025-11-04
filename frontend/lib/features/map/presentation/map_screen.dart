// lib/features/map/presentation/map_screen.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:aurabus/core/providers/app_state.dart';
import 'package:provider/provider.dart'; // Importiamo Provider

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends State<MapScreen> {
  late GoogleMapController mapController;
  final LatLng _center = const LatLng(46.067808715456785, 11.130308912105304);


  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<MyAppState>();

    if (appState.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    return GoogleMap(
      style: appState.mapStyle,
      onMapCreated: _onMapCreated,
      initialCameraPosition: CameraPosition(target: _center, zoom: 13.0),
      markers: appState.markers,
      mapType: MapType.normal,
      zoomControlsEnabled: true,
    );
  }
}