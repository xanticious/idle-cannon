// Cannon class - handles firing logic and upgrades
import { CONFIG } from "./config.js";
import { randomFloat, toDegrees, toRadians } from "./utils.js";
import { calculateLaunchAngles } from "./trajectoryUtils.js";

class Cannon {
  constructor(x, y, physicsWorld, particleSystem, worldManager) {
    this.x = x;
    this.y = y;
    this.physics = physicsWorld;
    this.particles = particleSystem;
    this.worldManager = worldManager;

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

    // No targets timeout tracking
    this.lastTargetsFoundTime = Date.now();
    this.noTargetsTimeout = 5000; // 5 seconds

    console.log(
      "Cannon initialized with no-targets timeout:",
      this.noTargetsTimeout / 1000,
      "seconds"
    );
  }

  async update(deltaTime, isPaused = false, targetBricks = []) {
    // Update recoil animation (slower)
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - deltaTime * 0.003); // Slower animation
    }

    // Don't fire if paused
    if (isPaused) {
      return null;
    }

    // Check if we can fire
    const now = Date.now();
    if (now - this.lastShot >= this.getFireRate()) {
      const fireResult = await this.fire(targetBricks, false);
      this.lastShot = now;
      this.justFired = true;

      // Return any special signals from firing (like auto-destroy)
      return fireResult;
    }

    return null;
  }

  async fire(targetBricks = [], forceFire = false) {
    let targetAngle;

    // If we have brick targets, calculate smart targeting
    if (targetBricks.length > 0) {
      // Update the time we last had targets
      this.lastTargetsFoundTime = Date.now();
      targetAngle = await this.calculateSmartAngle(targetBricks);
    } else {
      // Check if we should auto-destroy the castle due to no targets timeout
      const timeSinceLastTargets = Date.now() - this.lastTargetsFoundTime;
      if (timeSinceLastTargets >= this.noTargetsTimeout) {
        console.log(
          `Auto-destroying castle after ${(timeSinceLastTargets / 1000).toFixed(
            1
          )}s of no targets`
        );
        // Return a special signal to indicate castle should be auto-destroyed
        return { autoDestroyCastle: true };
      }

      // Fallback to random angle if no targets but timeout not reached
      targetAngle = -45 * (Math.PI / 180); // -45 degrees

      if (window.location.search.includes("debug")) {
        console.log(
          `No targets found, firing at fallback angle: ${(
            (targetAngle * 180) /
            Math.PI
          ).toFixed(1)}° (${(timeSinceLastTargets / 1000).toFixed(
            1
          )}s since last targets)`
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
      x: Math.cos(-targetAngle) * this.getBallSpeed(),
      y: Math.sin(-targetAngle) * this.getBallSpeed(),
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
    return null; // Normal firing, no special action needed
  }

  // Upgrade getters with bonuses applied
  getFireRate() {
    const reduction = this.upgrades.fireRate * CONFIG.UPGRADES.EFFECTS.fireRate;
    return Math.max(200, this.fireRate * (1 - reduction));
  }

  getBallSpeed() {
    return this.worldManager.getCurrentSpeed(); // Use world-specific speed
  }

  getBallSize() {
    const bonus = this.upgrades.size * CONFIG.UPGRADES.EFFECTS.size;
    return this.ballSize * (1 + bonus);
  }

  getBallWeight() {
    return this.ballWeight; // Fixed weight, no upgrades
  }

  // Smart targeting methods
  async calculateLaunchAnglesToHitBrick({ endX, endY }) {
    // Use the new trajectory utility for more accurate calculations
    const angles = await calculateLaunchAngles({
      targetX: endX,
      targetY: endY,
      world: this.worldManager.getCurrentWorld(),
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

  async calculateSmartAngle(targetBricks) {
    const allValidAngles = [];

    // Use trajectory utility to calculate angles for each brick
    for (const { x, y } of targetBricks) {
      const angles = await calculateLaunchAngles({
        targetX: x,
        targetY: y,
        world: this.worldManager.getCurrentWorld(),
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
    }

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
      console.warn(
        "No valid angles found for any target bricks, using fallback angle"
      );
      targetAngle = 35 * (Math.PI / 180); // Fallback to 35 degrees
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
