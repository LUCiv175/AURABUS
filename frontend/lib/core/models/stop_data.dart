class StopData {
  final double? distance;
  final List<Route> routes;
  final String stopCode;
  final String? stopDesc;
  final int stopId;
  final double stopLat;
  final int stopLevel;
  final double stopLon;
  final String stopName;
  final String street;
  final String? town;
  final String type;
  final int wheelchairBoarding;

  StopData({
    required this.distance,
    required this.routes,
    required this.stopCode,
    required this.stopDesc,
    required this.stopId,
    required this.stopLat,
    required this.stopLevel,
    required this.stopLon,
    required this.stopName,
    required this.street,
    required this.town,
    required this.type,
    required this.wheelchairBoarding,
  });

  factory StopData.fromJson(Map<String, dynamic> json) {
    return StopData(
      distance: json['distance'] as double?,
      routes: (json['routes'] as List<dynamic>)
          .map((e) => Route.fromJson(e as Map<String, dynamic>))
          .toList(),
      stopCode: (json['stopCode'] as String?) ?? '',
      stopDesc: json['stopDesc'] as String?,
      stopId: json['stopId'] as int,
      stopLat: (json['stopLat'] as num).toDouble(),
      stopLevel: json['stopLevel'] as int,
      stopLon: (json['stopLon'] as num).toDouble(),
      stopName: (json['stopName'] as String?) ?? '',
      street: (json['street'] as String?) ?? '',
      town: (json['town'] as String?) ?? '',
      type: (json['type'] as String?) ?? '',
      wheelchairBoarding: json['wheelchairBoarding'] as int,
    );
  }
}

class Route {
  final int areaId;
  final String? news;
  final String? routeColor;
  final int routeId;
  final String routeLongName;
  final String routeShortName;
  final int routeType;
  final String type;

  Route({
    required this.areaId,
    required this.news,
    required this.routeColor,
    required this.routeId,
    required this.routeLongName,
    required this.routeShortName,
    required this.routeType,
    required this.type,
  });

  factory Route.fromJson(Map<String, dynamic> json) {
    return Route(
      areaId: json['areaId'] as int,
      news: (json['news'] as String?) ?? '',
      routeColor: (json['routeColor'] as String?) ?? '',
      routeId: json['routeId'] as int,
      routeLongName: (json['routeLongName'] as String?) ?? '',
      routeShortName: (json['routeShortName'] as String?) ?? '',
      routeType: json['routeType'] as int,
      type: (json['type'] as String?) ?? '',
    );
  }
}
