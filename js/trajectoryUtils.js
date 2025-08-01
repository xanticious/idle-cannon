// Trajectory calculation utilities for ballistic projectiles

/**
 * Calculate the launch angle(s) needed to hit a target with a projectile
 * considering a rigid barrel that the projectile travels through before following ballistics
 * with air resistance
 *
 * @param {Object} params - The calculation parameters
 * @param {number} params.barrelStartX - X position where projectile starts (cannon pivot)
 * @param {number} params.barrelStartY - Y position where projectile starts (cannon pivot)
 * @param {number} params.barrelLength - Length of the barrel in pixels
 * @param {number} params.projectileSpeed - Initial speed in pixels per second
 * @param {number} params.gravity - Gravity acceleration in pixels per second squared (positive = downward)
 * @param {number} params.targetX - Target X position in pixels
 * @param {number} params.targetY - Target Y position in pixels
 * @param {number} params.frictionAir - Air resistance coefficient (default 0.01 to match Matter.js)
 * @returns {null|number[]} - null if unreachable, array of angles in radians (1 or 2 solutions)
 */
export function calculateLaunchAngles({
  barrelStartX,
  barrelStartY,
  barrelLength,
  projectileSpeed,
  gravity,
  targetX,
  targetY,
  frictionAir = 0.01, // Default air resistance to match Matter.js
}) {
  // Check if target is behind the cannon
  if (targetX <= barrelStartX) {
    return null; // Target is behind or at cannon position
  }

  const minAngle = -5 * (Math.PI / 180); // -5 degrees in radians
  const maxAngle = 185 * (Math.PI / 180); // 185 degrees in radians
  const angleStepSize = 0.1 * (Math.PI / 180); // 0.1 degrees in radians
  const timeStep = 0.1; // 1/10 of a second
  const maxSimulationTime = 10.0; // 10 seconds
  const hitTolerance = 20; // pixels - how close we need to get to the target

  const solutions = [];

  for (let angle = minAngle; angle <= maxAngle; angle += angleStepSize) {
    // Use trigonometry to find position of barrel end
    const barrelEndX = barrelStartX + Math.cos(angle) * barrelLength;
    const barrelEndY = barrelStartY + Math.sin(angle) * barrelLength;

    // Initial velocity components
    let vx = Math.cos(angle) * projectileSpeed;
    let vy = Math.sin(angle) * projectileSpeed;

    // Simulate the projectile for up to 10 seconds
    let x = barrelEndX;
    let y = barrelEndY;
    let t = 0;
    let closestDistance = Infinity;

    while (t <= maxSimulationTime) {
      // Update position using current velocity
      x += vx * timeStep;
      y += vy * timeStep;

      // Apply air resistance (reduces velocity each frame)
      // Air resistance acts opposite to velocity direction
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > 0) {
        // Calculate air resistance factor, but clamp it to prevent velocity reversal
        const airResistanceFactor = frictionAir * timeStep;
        const clampedFactor = Math.min(airResistanceFactor, 0.99); // Never reduce velocity by more than 99%
        vx *= 1 - clampedFactor;
        vy *= 1 - clampedFactor;
      }

      // Update velocity due to gravity (after air resistance)
      vy += gravity * timeStep;

      // Check distance to target
      const distanceToTarget = Math.sqrt(
        Math.pow(x - targetX, 2) + Math.pow(y - targetY, 2)
      );

      closestDistance = Math.min(closestDistance, distanceToTarget);

      // If we hit the target (within tolerance), record this angle
      if (distanceToTarget <= hitTolerance) {
        solutions.push(angle);
        break;
      }

      // Stop if projectile has gone too far past target or fallen too far
      if (x > targetX + 500 || y > targetY + 500) {
        break;
      }

      t += timeStep;
    }
  }

  // Remove duplicate solutions that are very close to each other
  const uniqueSolutions = [];
  for (const angle of solutions) {
    const isDuplicate = uniqueSolutions.some(
      (existing) => Math.abs(existing - angle) < 0.05 // 0.05 radians ≈ 2.9 degrees
    );
    if (!isDuplicate) {
      uniqueSolutions.push(angle);
    }
  }

  return uniqueSolutions.length > 0 ? uniqueSolutions : null;
}

/**
 * Calculate trajectory points for visualization
 *
 * @param {number} barrelStartX - Starting X position
 * @param {number} barrelStartY - Starting Y position
 * @param {number} barrelLength - Length of the cannon barrel
 * @param {number} angle - Launch angle in radians
 * @param {number} speed - Initial speed
 * @param {number} gravity - Gravity acceleration
 * @param {number} maxX - Maximum X to calculate to
 * @param {number} timeStep - Time step for calculations (default 0.1s)
 * @param {number} frictionAir - Air resistance coefficient (default 0.01 to match Matter.js)
 * @returns {Array} Array of {x, y, t} points
 */
export function calculateTrajectoryPoints(
  barrelStartX,
  barrelStartY,
  barrelLength,
  angle,
  speed,
  gravity,
  maxX,
  timeStep = 0.1,
  frictionAir = 0.01
) {
  const points = [];
  const startX = barrelStartX + Math.cos(angle) * barrelLength;
  const startY = barrelStartY + Math.sin(angle) * barrelLength;

  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  // Calculate trajectory points with air resistance
  const maxTime = Math.abs((maxX - startX) / vx) + 1; // Add buffer time

  for (let t = 0; t <= maxTime; t += timeStep) {
    const x = startX + vx * t;
    const y = startY + vy * t;

    points.push({ x, y, t });

    // Apply air resistance for next iteration
    // Air resistance acts opposite to velocity direction
    const currentSpeed = Math.sqrt(vx * vx + vy * vy);
    if (currentSpeed > 0) {
      // Calculate air resistance factor, but clamp it to prevent velocity reversal
      const airResistanceFactor = frictionAir * timeStep;
      const clampedFactor = Math.min(airResistanceFactor, 0.99); // Never reduce velocity by more than 99%
      vx *= 1 - clampedFactor;
      vy *= 1 - clampedFactor;
    }

    // Update velocity due to gravity (after air resistance)
    vy += gravity * timeStep;

    // Stop if we've gone past the target X or too far down
    if (x > maxX + 50 || y > startY + 1000) {
      break;
    }
  }

  return points;
}

/**
 * Get the barrel end position given barrel start position, angle, and length
 *
 * @param {number} barrelStartX - Barrel start X position
 * @param {number} barrelStartY - Barrel start Y position
 * @param {number} angle - Barrel angle in radians
 * @param {number} barrelLength - Length of barrel
 * @returns {Object} - {x, y} barrel end position
 */
export function getBarrelEndPosition(
  barrelStartX,
  barrelStartY,
  angle,
  barrelLength
) {
  return {
    x: barrelStartX + Math.cos(angle) * barrelLength,
    y: barrelStartY + Math.sin(angle) * barrelLength,
  };
}
