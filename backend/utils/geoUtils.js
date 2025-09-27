/**
 * Geographic calculation utilities
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number}
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of start point
 * @param {number} lon1 - Longitude of start point
 * @param {number} lat2 - Latitude of end point
 * @param {number} lon2 - Longitude of end point
 * @returns {number} - Bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  
  const x = Math.sin(dLon) * Math.cos(lat2Rad);
  const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = toDegrees(Math.atan2(x, y));
  return (bearing + 360) % 360;
}

/**
 * Check if a point is within a bounding box
 * @param {number} lat - Latitude of the point
 * @param {number} lon - Longitude of the point
 * @param {Object} bounds - Bounding box {north, south, east, west}
 * @returns {boolean}
 */
function isPointInBounds(lat, lon, bounds) {
  return lat >= bounds.south && lat <= bounds.north &&
    lon >= bounds.west && lon <= bounds.east;
}

/**
 * Get bounding box for a center point and radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} - Bounding box {north, south, east, west}
 */
function getBoundingBox(centerLat, centerLon, radiusKm) {
  const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(centerLat)));
  
  return {
    north: centerLat + latDelta,
    south: centerLat - latDelta,
    east: centerLon + lonDelta,
    west: centerLon - lonDelta
  };
}

/**
 * Calculate the destination point given distance and bearing from start point
 * @param {number} lat - Start latitude
 * @param {number} lon - Start longitude
 * @param {number} distance - Distance in kilometers
 * @param {number} bearing - Bearing in degrees
 * @returns {Object} - {lat, lon} of destination point
 */
function getDestinationPoint(lat, lon, distance, bearing) {
  const R = 6371; // Earth's radius in km
  const d = distance / R; // Angular distance
  const bearingRad = toRadians(bearing);
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);
  
  const destLat = Math.asin(
    Math.sin(latRad) * Math.cos(d) +
    Math.cos(latRad) * Math.sin(d) * Math.cos(bearingRad)
  );
  
  const destLon = lonRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(d) * Math.cos(latRad),
    Math.cos(d) - Math.sin(latRad) * Math.sin(destLat)
  );
  
  return {
    lat: toDegrees(destLat),
    lon: toDegrees(destLon)
  };
}

/**
 * Find the closest point on a line segment to a given point
 * @param {Object} point - {lat, lon}
 * @param {Object} lineStart - {lat, lon}
 * @param {Object} lineEnd - {lat, lon}
 * @returns {Object} - {lat, lon, distance}
 */
function closestPointOnLine(point, lineStart, lineEnd) {
  const A = point.lat - lineStart.lat;
  const B = point.lon - lineStart.lon;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lon - lineStart.lon;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let closestPoint;
  
  if (param < 0) {
    closestPoint = lineStart;
  } else if (param > 1) {
    closestPoint = lineEnd;
  } else {
    closestPoint = {
      lat: lineStart.lat + param * C,
      lon: lineStart.lon + param * D
    };
  }
  
  const distance = calculateDistance(
    point.lat, point.lon,
    closestPoint.lat, closestPoint.lon
  );
  
  return { ...closestPoint, distance };
}

/**
 * Simplify a path using Douglas-Peucker algorithm
 * @param {Array} points - Array of {lat, lon} points
 * @param {number} tolerance - Tolerance in kilometers
 * @returns {Array} - Simplified array of points
 */
function simplifyPath(points, tolerance = 0.01) {
  if (points.length <= 2) return points;
  
  // Find the point with maximum distance from the line
  let maxDistance = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const result = closestPointOnLine(
      points[i],
      points[0],
      points[points.length - 1]
    );
    
    if (result.distance > maxDistance) {
      maxDistance = result.distance;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Calculate total distance of a path
 * @param {Array} points - Array of {lat, lon} points
 * @returns {number} - Total distance in kilometers
 */
function calculatePathDistance(points) {
  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(
      points[i - 1].lat, points[i - 1].lon,
      points[i].lat, points[i].lon
    );
  }
  
  return totalDistance;
}

/**
 * Check if a point is inside a polygon (ray casting algorithm)
 * @param {Object} point - {lat, lon}
 * @param {Array} polygon - Array of {lat, lon} points forming the polygon
 * @returns {boolean}
 */
function isPointInPolygon(point, polygon) {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lon < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

module.exports = {
  calculateDistance,
  toRadians,
  toDegrees,
  calculateBearing,
  isPointInBounds,
  getBoundingBox,
  getDestinationPoint,
  closestPointOnLine,
  simplifyPath,
  calculatePathDistance,
  isPointInPolygon
};