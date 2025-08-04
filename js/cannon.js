// Cannon class - handles firing logic and upgrades
import { CONFIG } from "./config.js";
import { randomFloat, toDegrees, toRadians } from "./utils.js";
import {
  calculateLaunchAngles,
  calculateTrajectoryPoints,
  getBarrelEndPosition,
} from "./trajectoryUtils.js";

class Cannon {
  constructor(x, y, physicsWorld, particleSystem) {
    this.x = x;
    this.y = y;
    this.physics = physicsWorld;
    this.particles = particleSystem;

    // Firing properties
    this.fireRate = CONFIG.CANNON.BASE_FIRE_RATE;
    this.lastShot = 0;
    this.justFired = false;

    // Cannonball properties
    this.ballSpeed = CONFIG.CANNON.BASE_SPEED;
    this.ballSize = CONFIG.CANNON.BASE_SIZE;
    this.ballWeight = CONFIG.CANNON.WEIGHT;

    // Upgrades
    this.upgrades = {
      fireRate: 0,
      size: 0,
    };

    // Visual properties
    this.angle = 0;
    this.recoil = 0;
    this.recoilAnimating = false;
    this.barrelLength = 40;
    this.width = 60;
    this.height = 30;

    // Debug visualization properties
    this.debugInfo = {
      targetBricks: [],
      calculatedTrajectories: [],
      validAngles: [],
      selectedAngle: null,
      lastCalculation: 0,
    };
  }

  update(deltaTime, isPaused = false, targetBricks = []) {
    // Update recoil animation (slower)
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - deltaTime * 0.003); // Slower animation
    }

    // Don't fire if paused
    if (isPaused) {
      return;
    }

    // Check if we can fire
    const now = Date.now();
    if (now - this.lastShot >= this.getFireRate()) {
      this.fire(targetBricks, false);
      this.lastShot = now;
      this.justFired = true;
    }
  }

  fire(targetBricks = [], forceFire = false) {
    let targetAngle;

    // If we have brick targets, calculate smart targeting
    if (targetBricks.length > 0) {
      targetAngle = this.calculateSmartAngle(targetBricks);
    } else {
      // Fallback to random angle if no targets
      targetAngle = -45 * (Math.PI / 180); // -30 degrees

      if (window.location.search.includes("debug")) {
        console.log(
          `No targets found, firing at fallback angle: ${(
            (targetAngle * 180) /
            Math.PI
          ).toFixed(1)}°`
        );
      }
    }

    // For forced firing (like in table building), use the current cannon angle
    if (forceFire) {
      targetAngle = this.angle;
    }

    // Create cannonball at barrel end
    const barrelEndX = this.x + Math.cos(-targetAngle) * this.barrelLength;
    const barrelEndY = this.y + Math.sin(-targetAngle) * this.barrelLength;

    // Calculate velocity (negative Y for upward)
    const velocity = {
      x: Math.cos(-targetAngle) * CONFIG.CANNON.SPEED,
      y: Math.sin(-targetAngle) * CONFIG.CANNON.SPEED,
    };

    // Create physics body with randomized values
    this.physics.createCannonball(
      barrelEndX,
      barrelEndY,
      this.getBallSize(),
      CONFIG.CANNON.WEIGHT,
      velocity
    );

    // Visual effects (muzzle flash should be in world space since particles are rendered with world offset)
    this.recoil = 1.0;
    this.angle = -targetAngle; // Store negative angle for rendering
    this.particles.createMuzzleFlash(barrelEndX, barrelEndY);
    this.justFired = true;

    // Smoke trail will be added in the main game loop
  }

  // Upgrade getters with bonuses applied
  getFireRate() {
    const reduction = this.upgrades.fireRate * CONFIG.UPGRADES.EFFECTS.fireRate;
    return Math.max(200, this.fireRate * (1 - reduction));
  }

  getBallSpeed() {
    return this.ballSpeed; // Fixed speed, no upgrades
  }

  getBallSize() {
    const bonus = this.upgrades.size * CONFIG.UPGRADES.EFFECTS.size;
    return this.ballSize * (1 + bonus);
  }

  getBallWeight() {
    return this.ballWeight; // Fixed weight, no upgrades
  }

  // Smart targeting methods
  calculateLaunchAnglesToHitBrick({ endX, endY, speed, gravity }) {
    // Use the new trajectory utility for more accurate calculations
    const angles = calculateLaunchAngles({
      barrelStartX: this.x,
      barrelStartY: this.y,
      barrelLength: this.barrelLength,
      projectileSpeed: speed,
      gravity: gravity,
      targetX: endX,
      targetY: endY,
      frictionAir: 0.01, // Match Matter.js default air resistance
    });

    if (window.location.search.includes("debug")) {
      if (angles) {
        console.log(
          `Found ${angles.length} valid angles for target (${endX.toFixed(
            1
          )}, ${endY.toFixed(1)}):`,
          angles.map((a) => ((a * 180) / Math.PI).toFixed(1) + "°").join(", ")
        );
      } else {
        console.log(
          `No valid angles found for target (${endX.toFixed(1)}, ${endY.toFixed(
            1
          )})`
        );
      }
    }

    return angles;
  }

  calculateAllowedAngles(bricks, gravity, projectileSpeed) {
    const allowedAngles = new Set();

    // Clear previous debug info
    if (window.location.search.includes("debug")) {
      this.debugInfo.targetBricks = [];
      this.debugInfo.calculatedTrajectories = [];
    }

    bricks.forEach(({ x, y }) => {
      // Use the new trajectory utility instead of the old method
      const angles = calculateLaunchAngles({
        barrelStartX: this.x,
        barrelStartY: this.y,
        barrelLength: this.barrelLength,
        projectileSpeed: projectileSpeed,
        gravity: gravity,
        targetX: x,
        targetY: y,
        frictionAir: 0.01, // Match Matter.js default air resistance
      });

      if (angles) {
        // Add all valid angles to the set
        angles.forEach((angle) => {
          if (
            angle > CONFIG.CANNON.MIN_ANGLE &&
            angle < CONFIG.CANNON.MAX_ANGLE
          ) {
            allowedAngles.add(Math.floor(angle * 1000) / 1000); // Round to 3 decimal places
          }
        });
      }

      // Store debug info for ALL bricks (whether angles found or not)
      if (window.location.search.includes("debug")) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.debugInfo.targetBricks.push({
          x,
          y,
          angles,
          validAngle: angles && angles.length > 0 ? angles[0] : null,
          dx,
          dy,
          distance,
          reachable: dx > 0, // Must be to the right of cannon
          calculationData: {
            dx,
            dy,
            speed: projectileSpeed,
            gravity,
            speedSquared: projectileSpeed * projectileSpeed,
            discriminant: angles ? "found solutions" : "no solutions",
          },
        });

        // Calculate trajectory points for visualization (only for valid angles)
        if (angles && angles.length > 0) {
          const firstAngle = angles[0];
          if (
            firstAngle > CONFIG.CANNON.MIN_ANGLE &&
            firstAngle < CONFIG.CANNON.MAX_ANGLE
          ) {
            // Use the trajectory utility for consistent calculations
            const barrelEnd = getBarrelEndPosition(
              this.x,
              this.y,
              firstAngle,
              this.barrelLength
            );
            const trajectory = calculateTrajectoryPoints(
              barrelEnd.x,
              barrelEnd.y,
              firstAngle,
              projectileSpeed,
              gravity,
              x + 200, // Extend beyond target
              0.1, // Time step
              0.01 // Air resistance to match Matter.js
            );
            this.debugInfo.calculatedTrajectories.push({
              points: trajectory,
              targetX: x,
              targetY: y,
              angle: firstAngle,
            });
          }
        }
      }
    });

    if (window.location.search.includes("debug")) {
      this.debugInfo.validAngles = Array.from(allowedAngles);
      this.debugInfo.lastCalculation = Date.now();
    }

    return Array.from(allowedAngles);
  }

  // Gaussian-like blur function
  gaussianBlur(value, sigma) {
    // Simple Box-Muller transform for gaussian distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return value + z0 * sigma;
  }

  // Calculate trajectory points for debug visualization (using utility)
  calculateTrajectoryPoints(startX, startY, angle, speed, gravity, maxX) {
    // Use the imported trajectory utility for consistency
    return calculateTrajectoryPoints(
      startX,
      startY,
      angle,
      speed,
      gravity,
      maxX,
      0.1, // Time step
      0.01 // Air resistance to match Matter.js
    );
  }

  calculateSmartAngle(targetBricks) {
    // Get current world gravity from the engine (since WorldManager updates it)
    const matterGravity = this.physics.engine.world.gravity.y;

    // Convert Matter.js gravity (pixels/frame²) to physics formula gravity (pixels/second²)
    // Matter.js runs at 60 FPS, so gravity in pixels/second² = matterGravity × 60²
    const gravity = matterGravity * 3600; // 60² = 3600

    // Calculate possible angles to hit bricks
    const averageSpeed =
      (CONFIG.CANNON.SPEED_MAX + CONFIG.CANNON.SPEED_MIN) / 2;
    // Convert speed from pixels/frame to pixels/second (multiply by 60 FPS)
    const speedInPixelsPerSecond = averageSpeed * 60;

    // Debug logging
    if (window.location.search.includes("debug")) {
      console.log(
        `Smart targeting: ${targetBricks.length} bricks, Matter gravity: ${matterGravity}, Physics gravity: ${gravity}`
      );
    }

    // Clear previous debug info
    if (window.location.search.includes("debug")) {
      this.debugInfo.targetBricks = [];
      this.debugInfo.calculatedTrajectories = [];
      this.debugInfo.validAngles = [];
    }

    const allValidAngles = [];

    // Use trajectory utility to calculate angles for each brick
    targetBricks.forEach(({ x, y }) => {
      const angles = calculateLaunchAngles({
        barrelStartX: this.x,
        barrelStartY: this.y,
        barrelLength: this.barrelLength,
        projectileSpeed: speedInPixelsPerSecond,
        gravity: gravity,
        targetX: x,
        targetY: y,
        frictionAir: 0.01, // Match Matter.js default air resistance
      });

      if (angles) {
        // Filter angles within cannon constraints and add to valid angles
        angles.forEach((angle) => {
          if (
            angle > CONFIG.CANNON.MIN_ANGLE &&
            angle < CONFIG.CANNON.MAX_ANGLE
          ) {
            allValidAngles.push(angle);
          }
        });
      }
    });

    let targetAngle;

    if (allValidAngles.length > 0) {
      // Choose a random angle from the calculated angles
      const randomIndex = Math.floor(Math.random() * allValidAngles.length);
      targetAngle = allValidAngles[randomIndex];

      if (window.location.search.includes("debug")) {
        console.log(
          `Final angle: ${((targetAngle * 180) / Math.PI).toFixed(1)}°`
        );
      }
    } else {
      debugger;
    }

    return targetAngle;
  }

  // Apply upgrade
  upgrade(type) {
    if (this.upgrades.hasOwnProperty(type)) {
      this.upgrades[type]++;
      return true;
    }
    return false;
  }

  render(ctx) {
    ctx.save();

    // Move to cannon position
    ctx.translate(this.x, this.y);

    // Apply recoil offset
    const recoilOffset = this.recoil * 8;
    ctx.translate(-recoilOffset, 0);

    // Draw cannon base (wheels)
    ctx.fillStyle = "#654321";
    ctx.beginPath();
    ctx.arc(-15, 15, 12, 0, Math.PI * 2);
    ctx.arc(15, 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw cannon body
    ctx.fillStyle = CONFIG.COLORS.CANNON;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw barrel
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillRect(0, -6, this.barrelLength, 12);

    // Draw barrel end highlight
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw cannon details
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-20, -10, 40, 20);

    // Draw straps/bands
    ctx.strokeStyle = "#2F2F2F";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, -8);
    ctx.lineTo(25, -8);
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(-25, 8);
    ctx.lineTo(25, 8);
    ctx.stroke();

    ctx.restore();
  }

  // Debug rendering method
  renderDebug(ctx, worldOffsetX = 0, worldOffsetY = 0) {
    if (!window.location.search.includes("debug")) {
      return;
    }

    const now = Date.now();
    // Only show debug info for recent calculations (last 10 seconds)
    if (now - this.debugInfo.lastCalculation > 10000) {
      return;
    }

    ctx.save();

    // Only work with the first target brick for simplified debugging
    if (this.debugInfo.targetBricks.length > 0) {
      const firstBrick = this.debugInfo.targetBricks[0];
      let { x, y, angles, validAngle, reachable, distance } = firstBrick;

      const screenX = x + worldOffsetX;
      const screenY = y + worldOffsetY;
      const cannonScreenX = this.x + worldOffsetX;
      const cannonScreenY = this.y + worldOffsetY;

      // Draw target crosshair and circle on the first brick
      ctx.strokeStyle = angles
        ? validAngle > CONFIG.CANNON.MIN_ANGLE &&
          validAngle < CONFIG.CANNON.MAX_ANGLE
          ? "#00FF00"
          : "#FFFF00"
        : reachable
        ? "#FF4444"
        : "#FF0000";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;

      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(screenX - 15, screenY);
      ctx.lineTo(screenX + 15, screenY);
      ctx.moveTo(screenX, screenY - 15);
      ctx.lineTo(screenX, screenY + 15);
      ctx.stroke();

      // Draw target circle
      ctx.beginPath();
      ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Draw distance and angle info
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "12px Arial";
      ctx.globalAlpha = 1.0;
      if (angles && validAngle !== null) {
        ctx.fillText(
          `${((validAngle * 180) / Math.PI).toFixed(1)}° (${distance.toFixed(
            0
          )}px)`,
          screenX + 25,
          screenY - 10
        );
      } else if (!reachable) {
        ctx.fillText(
          `Behind (${distance.toFixed(0)}px)`,
          screenX + 25,
          screenY - 10
        );
      } else {
        ctx.fillText(
          `No Solution (${distance.toFixed(0)}px)`,
          screenX + 25,
          screenY - 10
        );
      }

      //temporarily hardcoding to 45 degree angle.
      angles = [];
      validAngle = -45 * (Math.PI / 180);
      // Draw ballistic trajectory parabola for the first brick
      if (angles && validAngle !== null) {
        // Get physics values
        const matterGravity = this.physics.engine.world.gravity.y;
        const gravity = matterGravity * 3600; // Convert to pixels per second squared
        const averageSpeed =
          (CONFIG.CANNON.SPEED_MAX + CONFIG.CANNON.SPEED_MIN) / 2;
        const speedInPixelsPerSecond = averageSpeed * 60;

        // Calculate barrel end position for the valid angle using utility
        const barrelEnd = getBarrelEndPosition(
          this.x,
          this.y,
          validAngle,
          this.barrelLength
        );

        // Calculate trajectory points from barrel end to beyond target using utility
        const trajectoryPoints = calculateTrajectoryPoints(
          barrelEnd.x,
          barrelEnd.y,
          validAngle,
          speedInPixelsPerSecond,
          gravity,
          x + 200, // Extend beyond target
          0.1 // Time step
        );

        if (trajectoryPoints.length > 1) {
          // Draw trajectory parabola
          ctx.strokeStyle = "#00FFFF";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1.0;
          ctx.setLineDash([]);

          ctx.beginPath();
          let firstPoint = true;

          trajectoryPoints.forEach(({ x: trajX, y: trajY }) => {
            const trajScreenX = trajX + worldOffsetX;
            const trajScreenY = trajY + worldOffsetY;

            if (firstPoint) {
              ctx.moveTo(trajScreenX, trajScreenY);
              firstPoint = false;
            } else {
              ctx.lineTo(trajScreenX, trajScreenY);
            }
          });

          ctx.stroke();

          // Draw dots at key trajectory points
          ctx.fillStyle = "#00FFFF";
          trajectoryPoints.forEach(({ x: trajX, y: trajY }, index) => {
            if (index % 3 === 0) {
              // Every 3rd point
              ctx.beginPath();
              ctx.arc(
                trajX + worldOffsetX,
                trajY + worldOffsetY,
                3,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          });
        }
      }
    }

    // Draw debug info text with background (moved lower to avoid overlap)
    ctx.globalAlpha = 1.0;

    // Get physics values for display
    const matterGravity = this.physics.engine.world.gravity.y;
    const gravity = matterGravity * 3600; // Convert to pixels per second squared
    const averageSpeed =
      (CONFIG.CANNON.SPEED_MAX + CONFIG.CANNON.SPEED_MIN) / 2;
    const speedInPixelsPerSecond = averageSpeed * 60;

    const debugText = [
      `Smart Targeting Debug`,
      `Valid Angles: ${this.debugInfo.validAngles.length}`,
      `Target Bricks: ${this.debugInfo.targetBricks.length}`,
      `Selected: ${
        this.debugInfo.selectedAngle
          ? ((this.debugInfo.selectedAngle * 180) / Math.PI).toFixed(1) + "°"
          : "None"
      }`,
      `Matter Gravity: ${matterGravity.toFixed(3)}`,
      `Physics Gravity: ${gravity.toFixed(1)}`,
      `Speed (px/frame): ${averageSpeed}`,
      `Speed (px/sec): ${speedInPixelsPerSecond}`,
      `Time: ${((now - this.debugInfo.lastCalculation) / 1000).toFixed(
        1
      )}s ago`,
    ];

    // Add first brick analysis
    if (this.debugInfo.targetBricks.length > 0) {
      const firstBrick = this.debugInfo.targetBricks[0];
      debugText.push(
        `First Brick: (${firstBrick.x.toFixed(0)}, ${firstBrick.y.toFixed(0)})`
      );
      debugText.push(`Distance: ${firstBrick.distance.toFixed(0)}px`);
      debugText.push(`Reachable: ${firstBrick.reachable ? "Yes" : "No"}`);
      debugText.push(`Has Solution: ${firstBrick.angles ? "Yes" : "No"}`);
    }

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(5, 200, 280, debugText.length * 15 + 10);

    // Draw text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px Arial";
    debugText.forEach((text, index) => {
      ctx.fillText(text, 10, 220 + index * 15);
    });

    ctx.restore();
  }

  // Get stats for UI display
  getStats() {
    return {
      fireRate: `${(60000 / this.getFireRate()).toFixed(1)}/min`,
      size: `${this.getBallSize().toFixed(1)}px`,
    };
  }
}

// Export the Cannon class for use as a module
export default Cannon;
