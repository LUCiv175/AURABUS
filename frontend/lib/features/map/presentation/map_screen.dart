import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:aurabus/core/providers/app_state.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends ConsumerState<MapScreen> {
  late GoogleMapController mapController;
  final LatLng _center = const LatLng(46.067808715456785, 11.130308912105304);

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final appReadyAsync = ref.watch(appIsReadyProvider);

    return appReadyAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Text('Loading Error: $err'),
        ),
      ),
      data: (_) {
        final mapStyle = ref.watch(mapStyleProvider).value;
        final markers = ref.watch(markersProvider).value ?? {};

        return GoogleMap(
          style: mapStyle,
          onMapCreated: _onMapCreated,
          initialCameraPosition: CameraPosition(target: _center, zoom: 13.0),
          markers: markers,
          mapType: MapType.normal,
          zoomControlsEnabled: true,
        );
      },
    );
  }
}
