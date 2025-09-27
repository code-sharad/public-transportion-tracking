const { calculateDistance, calculateBearing, closestPointOnLine } = require('./geoUtils');
const TrackingHistory = require('../models/TrackingHistory');

/**
 * Advanced ETA calculation with multiple factors
 */
class ETACalculator {
  constructor() {
    // Configuration parameters
    this.config = {
      minSpeed: 5, // km/h - below this, vehicle is considered stopped
      defaultSpeed: 25, // km/h - default speed when no data available
      maxSpeed: 60, // km/h - maximum expected speed
      trafficFactors: {
        morning: { start: 7, end: 10, factor: 0.7 }, // 30% slower
        evening: { start: 17, end: 20, factor: 0.65 }, // 35% slower
        night: { start: 22, end: 5, factor: 1.2 }, // 20% faster
        default: 1.0
      },
      stopDuration: 30, // seconds - average time at each stop
      accelerationTime: 20, // seconds - time to reach cruising speed from stop
      historicalWeight: 0.4, // 40% weight for historical data
      currentWeight: 0.6 // 60% weight for current conditions
    };
  }

  /**
   * Calculate ETA for a vehicle to reach specific stops
   * @param {Object} vehicle - Vehicle object with current position
   * @param {Object} currentPosition - {lat, lng}
   * @param {number} currentSpeed - Current speed in km/h
   * @param {Array} upcomingStops - Array of stops ahead
   * @returns {Array} - Array of {stopId, eta, distance}
   */
  async calculateETA(vehicle, currentPosition, currentSpeed, upcomingStops = []) {
    try {
      // Get vehicle's route if not provided
      if (!vehicle.currentRoute || !vehicle.currentRoute.stops) {
        return [];
      }

      const route = vehicle.currentRoute;
      const stops = upcomingStops.length > 0 ? upcomingStops : route.stops;

      // Find current position on route
      const currentSegment = this.findCurrentSegment(currentPosition, route.path);
      
      // Get historical data for this route segment
      const historicalData = await this.getHistoricalData(
        vehicle.vehicleId,
        currentSegment.index
      );

      // Calculate traffic factor
      const trafficFactor = this.getTrafficFactor(new Date());

      // Calculate ETA for each stop
      const etas = [];
      let cumulativeTime = 0;
      let cumulativeDistance = 0;
      let previousPosition = currentPosition;

      for (const stop of stops) {
        // Skip stops that are behind the vehicle
        if (this.isStopBehind(currentPosition, stop, currentSegment)) {
          continue;
        }

        // Calculate distance to stop
        const distanceToStop = await this.calculateDistanceToStop(
          previousPosition,
          stop,
          route,
          currentSegment
        );

        cumulativeDistance += distanceToStop;

        // Calculate time to reach stop
        const timeToStop = this.calculateTimeToStop(
          distanceToStop,
          currentSpeed,
          historicalData,
          trafficFactor
        );

        cumulativeTime += timeToStop;

        // Add stop dwell time
        if (stop.avgDwellTime) {
          cumulativeTime += stop.avgDwellTime;
        } else {
          cumulativeTime += this.config.stopDuration;
        }

        etas.push({
          stopId: stop._id,
          stopName: stop.name,
          stopCode: stop.code,
          eta: Math.round(cumulativeTime / 60), // Convert to minutes
          distance: Math.round(cumulativeDistance * 100) / 100, // Round to 2 decimals
          confidence: this.calculateConfidence(historicalData, distanceToStop)
        });

        previousPosition = {
          lat: stop.location.coordinates[1],
          lng: stop.location.coordinates[0]
        };
      }

      return etas;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return [];
    }
  }

  /**
   * Find current segment of vehicle on route
   */
  findCurrentSegment(currentPosition, routePath) {
    let minDistance = Infinity;
    let bestSegment = { index: 0, position: currentPosition, distance: 0 };

    for (let i = 0; i < routePath.length - 1; i++) {
      const start = {
        lat: routePath[i].coordinates[1],
        lon: routePath[i].coordinates[0]
      };
      const end = {
        lat: routePath[i + 1].coordinates[1],
        lon: routePath[i + 1].coordinates[0]
      };

      const closest = closestPointOnLine(
        { lat: currentPosition.lat, lon: currentPosition.lng },
        start,
        end
      );

      if (closest.distance < minDistance) {
        minDistance = closest.distance;
        bestSegment = {
          index: i,
          position: { lat: closest.lat, lng: closest.lon },
          distance: closest.distance
        };
      }
    }

    return bestSegment;
  }

  /**
   * Check if stop is behind vehicle's current position
   */
  isStopBehind(currentPosition, stop, currentSegment) {
    // Simple check: if stop's route index is less than current segment
    // This is a simplified version - in production, use more sophisticated logic
    return stop.routeIndex < currentSegment.index;
  }

  /**
   * Calculate distance to stop along route
   */
  async calculateDistanceToStop(fromPosition, toStop, route, currentSegment) {
    // This is simplified - in production, calculate actual route distance
    const directDistance = calculateDistance(
      fromPosition.lat,
      fromPosition.lng,
      toStop.location.coordinates[1],
      toStop.location.coordinates[0]
    );

    // Apply route factor (routes are typically 1.2-1.5x direct distance)
    const routeFactor = 1.3;
    return directDistance * routeFactor;
  }

  /**
   * Calculate time to reach stop
   */
  calculateTimeToStop(distance, currentSpeed, historicalData, trafficFactor) {
    // Calculate base time using current speed
    let effectiveSpeed = currentSpeed;
    
    // If vehicle is stopped or very slow, use default speed
    if (effectiveSpeed < this.config.minSpeed) {
      effectiveSpeed = this.config.defaultSpeed;
      // Add acceleration time
      return (distance / effectiveSpeed) * 3600 + this.config.accelerationTime;
    }

    // Apply traffic factor
    effectiveSpeed *= trafficFactor;

    // Blend with historical speed if available
    if (historicalData && historicalData.avgSpeed > 0) {
      effectiveSpeed = 
        effectiveSpeed * this.config.currentWeight +
        historicalData.avgSpeed * this.config.historicalWeight;
    }

    // Ensure speed is within reasonable bounds
    effectiveSpeed = Math.max(
      this.config.minSpeed,
      Math.min(this.config.maxSpeed, effectiveSpeed)
    );

    // Calculate time in seconds
    return (distance / effectiveSpeed) * 3600;
  }

  /**
   * Get traffic factor based on time of day
   */
  getTrafficFactor(date) {
    const hour = date.getHours();
    const factors = this.config.trafficFactors;

    // Check morning rush
    if (hour >= factors.morning.start && hour < factors.morning.end) {
      return factors.morning.factor;
    }

    // Check evening rush
    if (hour >= factors.evening.start && hour < factors.evening.end) {
      return factors.evening.factor;
    }

    // Check night time
    if (hour >= factors.night.start || hour < factors.night.end) {
      return factors.night.factor;
    }

    return factors.default;
  }

  /**
   * Get historical data for route segment
   */
  async getHistoricalData(vehicleId, segmentIndex) {
    try {
      // Get historical data for the last 7 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const history = await TrackingHistory.find({
        vehicleId,
        timestamp: { $gte: startDate },
        segmentIndex // This would need to be added to the model
      }).lean();

      if (history.length === 0) {
        return null;
      }

      // Calculate average speed for this segment
      const speeds = history.map(h => h.speed).filter(s => s > this.config.minSpeed);
      const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

      return {
        avgSpeed,
        sampleSize: history.length,
        reliability: Math.min(history.length / 100, 1) // 0-1 scale
      };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return null;
    }
  }

  /**
   * Calculate confidence level for ETA prediction
   */
  calculateConfidence(historicalData, distance) {
    let confidence = 0.5; // Base confidence

    // Increase confidence if we have good historical data
    if (historicalData && historicalData.reliability > 0.5) {
      confidence += 0.3 * historicalData.reliability;
    }

    // Decrease confidence for longer distances
    const distancePenalty = Math.min(distance / 50, 0.3); // Max 30% penalty
    confidence -= distancePenalty;

    // Apply time of day factor (more predictable during off-peak)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      confidence += 0.1; // Night time is more predictable
    }

    return Math.max(0.2, Math.min(0.95, confidence)); // Clamp between 20% and 95%
  }

  /**
   * Update ETA based on real-time conditions
   */
  async updateETAWithRealTimeData(vehicleId, delays, incidents) {
    // This method would integrate with real-time traffic APIs
    // and user-reported delays to update ETA calculations
    
    // Placeholder for real-time updates
    const adjustments = {
      delays: delays || [],
      incidents: incidents || [],
      timestamp: new Date()
    };

    // Store adjustments for future reference
    // This would be used to improve historical predictions
    
    return adjustments;
  }
}

// Export singleton instance
const etaCalculator = new ETACalculator();

/**
 * Main export function for backward compatibility
 */
async function calculateETA(vehicle, currentPosition, currentSpeed) {
  return etaCalculator.calculateETA(vehicle, currentPosition, currentSpeed);
}

module.exports = {
  calculateETA,
  ETACalculator,
  etaCalculator
};