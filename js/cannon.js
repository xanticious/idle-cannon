// Cannon class - handles firing logic and upgrades

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
    this.ballWeight = CONFIG.CANNON.BASE_WEIGHT;

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
      this.fire(targetBricks);
      this.lastShot = now;
      this.justFired = true;
    }
  }

  fire(targetBricks = []) {
    let targetAngle;

    // If we have brick targets, calculate smart targeting
    if (targetBricks.length > 0) {
      targetAngle = this.calculateSmartAngle(targetBricks);
    } else {
      // Fallback to random angle if no targets
      targetAngle = -30 * (Math.PI / 180); // -30 degrees

      if (window.location.search.includes("debug")) {
        console.log(
          `No targets found, firing at fallback angle: ${(
            (targetAngle * 180) /
            Math.PI
          ).toFixed(1)}°`
        );
      }
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
  calculateLaunchAnglesToHitBrick({
    startX,
    startY,
    endX,
    endY,
    speed,
    gravity,
  }) {
    const dx = endX - startX;
    const dy = endY - startY;
    const v = speed;
    const g = gravity;

    // Check if target is reachable
    if (dx <= 0) {
      if (window.location.search.includes("debug")) {
        console.log(
          `Target behind cannon: dx=${dx.toFixed(1)}, target=(${endX.toFixed(
            1
          )}, ${endY.toFixed(1)})`
        );
      }
      return null; // Target is behind or at same X position
    }

    const speedSquared = v * v;
    const discriminant =
      speedSquared * speedSquared - g * (g * dx * dx + 2 * dy * speedSquared);

    if (window.location.search.includes("debug")) {
      console.log(`Ballistics calc for target (${endX.toFixed(
        1
      )}, ${endY.toFixed(1)}):
        dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}
        speed=${v.toFixed(1)}, gravity=${g.toFixed(1)}
        speedSquared=${speedSquared.toFixed(1)}
        discriminant=${discriminant.toFixed(1)}
        discriminant components: v^4=${(speedSquared * speedSquared).toFixed(
          1
        )}, g*(g*dx^2 + 2*dy*v^2)=${(
        g *
        (g * dx * dx + 2 * dy * speedSquared)
      ).toFixed(1)}`);
    }

    if (discriminant < 0) {
      return null; // Target is unreachable
    }

    const sqrtDisc = Math.sqrt(discriminant);

    // Calculate both possible angles
    const angle1 = Math.atan((speedSquared + sqrtDisc) / (g * dx));
    const angle2 = Math.atan((speedSquared - sqrtDisc) / (g * dx));

    const validAngles = [];

    // Only return valid angles within reasonable range
    if (angle1 < Math.PI / 2) {
      validAngles.push(angle1);
    }
    if (angle2 < Math.PI / 2) {
      validAngles.push(angle2);
    }

    if (window.location.search.includes("debug") && validAngles.length > 0) {
      console.log(
        `  Found valid angles: ${validAngles
          .map((a) => ((a * 180) / Math.PI).toFixed(1) + "°")
          .join(", ")}`
      );
    }

    return validAngles.length > 0 ? validAngles : null;
  }

  calculateAllowedAngles(
    bricks,
    barrelEndX,
    barrelEndY,
    gravity,
    projectileSpeed
  ) {
    const allowedAngles = new Set();

    // Clear previous debug info
    if (window.location.search.includes("debug")) {
      this.debugInfo.targetBricks = [];
      this.debugInfo.calculatedTrajectories = [];
    }

    bricks.forEach(({ x, y }) => {
      const angles = this.calculateLaunchAnglesToHitBrick({
        startX: barrelEndX,
        startY: barrelEndY,
        endX: x,
        endY: y,
        speed: projectileSpeed,
        gravity: gravity,
      });

      if (angles) {
        const [angle1, angle2] = angles;
        const angleToAdd = Math.min(angle1, angle2);
        if (
          angleToAdd > CONFIG.CANNON.MIN_ANGLE &&
          angleToAdd < CONFIG.CANNON.MAX_ANGLE
        ) {
          allowedAngles.add(Math.floor(angleToAdd));
          allowedAngles.add(Math.ceil(angleToAdd));
        }
      }

      // Store debug info for ALL bricks (whether angles found or not)
      if (window.location.search.includes("debug")) {
        const dx = x - barrelEndX;
        const dy = y - barrelEndY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.debugInfo.targetBricks.push({
          x,
          y,
          angles,
          validAngle: angles ? Math.min(angles[0], angles[1]) : null,
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
            discriminant: angles ? "positive" : "negative or zero",
          },
        });

        // Calculate trajectory points for visualization (only for valid angles)
        if (angles) {
          const angleToAdd = Math.min(angles[0], angles[1]);
          if (
            angleToAdd > CONFIG.CANNON.MIN_ANGLE &&
            angleToAdd < CONFIG.CANNON.MAX_ANGLE
          ) {
            const trajectory = this.calculateTrajectoryPoints(
              barrelEndX,
              barrelEndY,
              angleToAdd,
              projectileSpeed,
              gravity,
              x
            );
            this.debugInfo.calculatedTrajectories.push({
              points: trajectory,
              targetX: x,
              targetY: y,
              angle: angleToAdd,
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

  // Calculate trajectory points for debug visualization
  calculateTrajectoryPoints(startX, startY, angle, speed, gravity, maxX) {
    const points = [];
    const vx = Math.cos(-angle) * speed;
    const vy = Math.sin(-angle) * speed;

    // Calculate trajectory points up to the target X or ground
    const timeStep = 0.1; // seconds
    const maxTime = Math.abs((maxX - startX) / vx) + 1; // Add buffer time

    for (let t = 0; t <= maxTime; t += timeStep) {
      const x = startX + vx * t;
      const y = startY + vy * t + 0.5 * gravity * t * t;

      points.push({ x, y, t });

      // Stop if we've gone past the target X or hit the ground
      if (x > maxX + 50 || y > CONFIG.PHYSICS.GROUND_Y) {
        break;
      }
    }

    return points;
  }

  calculateSmartAngle(targetBricks) {
    // Calculate barrel end position
    const barrelEndX = this.x + Math.cos(0) * this.barrelLength; // Assume horizontal for calculation
    const barrelEndY = this.y;

    // Get current world gravity from the engine (since WorldManager updates it)
    const matterGravity = this.physics.engine.world.gravity.y;

    // Convert Matter.js gravity (pixels/frame²) to physics formula gravity (pixels/second²)
    // Matter.js runs at 60 FPS, so gravity in pixels/second² = matterGravity × 60²
    const gravity = matterGravity * 3600; // 60² = 3600

    // Debug logging
    if (window.location.search.includes("debug")) {
      console.log(
        `Smart targeting: ${targetBricks.length} bricks, Matter gravity: ${matterGravity}, Physics gravity: ${gravity}`
      );
    }

    // Calculate possible angles to hit bricks
    const averageSpeed =
      (CONFIG.CANNON.SPEED_MAX + CONFIG.CANNON.SPEED_MIN) / 2;
    // Convert speed from pixels/frame to pixels/second (multiply by 60 FPS)
    const speedInPixelsPerSecond = averageSpeed * 60;

    const allowedAngles = this.calculateAllowedAngles(
      targetBricks,
      barrelEndX,
      barrelEndY,
      gravity,
      speedInPixelsPerSecond
    );

    let targetAngle;

    if (allowedAngles.length > 0) {
      // Debug logging
      if (window.location.search.includes("debug")) {
        console.log(
          `Found ${allowedAngles.length} valid angles:`,
          allowedAngles.map((a) => ((a * 180) / Math.PI).toFixed(1) + "°")
        );
      }

      // Choose a random angle from the calculated angles
      const randomIndex = Math.floor(Math.random() * allowedAngles.length);
      targetAngle = allowedAngles[randomIndex];

      // Store selected angle for debug visualization
      if (window.location.search.includes("debug")) {
        this.debugInfo.selectedAngle = targetAngle;
      }

      // Add some gaussian blur around the target angle
      // const blurAmount = Math.PI / 36; // 5 degrees in radians
      //targetAngle = this.gaussianBlur(targetAngle, blurAmount);

      if (window.location.search.includes("debug")) {
        console.log(
          `Final angle: ${((targetAngle * 180) / Math.PI).toFixed(1)}°`
        );
      }
    } else {
      // Fire at the ground if no valid angles found
      targetAngle = -50 * (Math.PI / 180); // -50 degrees

      if (window.location.search.includes("debug")) {
        this.debugInfo.selectedAngle = targetAngle;
        console.log(
          `No valid angles found, using fallback: ${(
            (targetAngle * 180) /
            Math.PI
          ).toFixed(1)}°`
        );
      }
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

    // Draw lines from cannon to each brick being considered
    const barrelEndX = this.x + Math.cos(0) * this.barrelLength;
    const barrelEndY = this.y;

    this.debugInfo.targetBricks.forEach(
      ({ x, y, angles, validAngle, reachable, distance }) => {
        const screenX = x + worldOffsetX;
        const screenY = y + worldOffsetY;
        const cannonScreenX = barrelEndX + worldOffsetX;
        const cannonScreenY = barrelEndY + worldOffsetY;

        // Draw line from cannon to brick
        ctx.strokeStyle = angles
          ? validAngle > CONFIG.CANNON.MIN_ANGLE &&
            validAngle < CONFIG.CANNON.MAX_ANGLE
            ? "#00FF00"
            : "#FFFF00"
          : reachable
          ? "#FF4444"
          : "#FF0000";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(cannonScreenX, cannonScreenY);
        ctx.lineTo(screenX, screenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw distance label
        const midX = (cannonScreenX + screenX) / 2;
        const midY = (cannonScreenY + screenY) / 2;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "8px Arial";
        ctx.globalAlpha = 0.8;
        ctx.fillText(`${distance.toFixed(0)}px`, midX, midY);
      }
    );

    ctx.globalAlpha = 1.0;

    // Draw target brick indicators
    this.debugInfo.targetBricks.forEach(
      ({ x, y, angles, validAngle, reachable }) => {
        const screenX = x + worldOffsetX;
        const screenY = y + worldOffsetY;

        // Draw target crosshair
        ctx.strokeStyle = angles
          ? validAngle > CONFIG.CANNON.MIN_ANGLE &&
            validAngle < CONFIG.CANNON.MAX_ANGLE
            ? "#00FF00"
            : "#FFFF00"
          : reachable
          ? "#FF4444"
          : "#FF0000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX - 10, screenY);
        ctx.lineTo(screenX + 10, screenY);
        ctx.moveTo(screenX, screenY - 10);
        ctx.lineTo(screenX, screenY + 10);
        ctx.stroke();

        // Draw target circle
        ctx.beginPath();
        ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();

        // Draw angle info or reason for failure
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "10px Arial";
        if (angles && validAngle !== null) {
          ctx.fillText(
            `${((validAngle * 180) / Math.PI).toFixed(1)}°`,
            screenX + 20,
            screenY - 5
          );
        } else if (!reachable) {
          ctx.fillText("Behind", screenX + 20, screenY - 5);
        } else {
          ctx.fillText("No Solution", screenX + 20, screenY - 5);
        }
      }
    );

    // Draw calculated trajectories
    this.debugInfo.calculatedTrajectories.forEach(
      ({ points, angle }, index) => {
        if (points.length < 2) return;

        // Use different colors for different trajectories
        const colors = ["#00FF00", "#0080FF", "#FF8000", "#FF0080", "#80FF00"];
        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        let firstPoint = true;

        points.forEach(({ x, y }) => {
          const screenX = x + worldOffsetX;
          const screenY = y + worldOffsetY;

          if (firstPoint) {
            ctx.moveTo(screenX, screenY);
            firstPoint = false;
          } else {
            ctx.lineTo(screenX, screenY);
          }
        });

        ctx.stroke();

        // Draw dots at trajectory points
        ctx.globalAlpha = 0.8;
        points.forEach(({ x, y }, pointIndex) => {
          if (pointIndex % 5 === 0) {
            // Only every 5th point
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(x + worldOffsetX, y + worldOffsetY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
    );

    // Draw selected angle trajectory in bright color
    if (this.debugInfo.selectedAngle !== null) {
      const barrelEndX = this.x + Math.cos(0) * this.barrelLength;
      const barrelEndY = this.y;

      // Get physics values (matching calculateSmartAngle)
      const matterGravity = this.physics.engine.world.gravity.y;
      const gravity = matterGravity * 3600;
      const averageSpeed =
        (CONFIG.CANNON.SPEED_MAX + CONFIG.CANNON.SPEED_MIN) / 2;
      const speedInPixelsPerSecond = averageSpeed * 60;

      const selectedTrajectory = this.calculateTrajectoryPoints(
        barrelEndX,
        barrelEndY,
        this.debugInfo.selectedAngle,
        speedInPixelsPerSecond,
        gravity,
        CONFIG.CANVAS.WIDTH
      );

      if (selectedTrajectory.length > 1) {
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([8, 4]);

        ctx.beginPath();
        let firstPoint = true;

        selectedTrajectory.forEach(({ x, y }) => {
          const screenX = x + worldOffsetX;
          const screenY = y + worldOffsetY;

          if (firstPoint) {
            ctx.moveTo(screenX, screenY);
            firstPoint = false;
          } else {
            ctx.lineTo(screenX, screenY);
          }
        });

        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw debug info text with background
    ctx.globalAlpha = 1.0;

    // Get physics values for display
    const matterGravity = this.physics.engine.world.gravity.y;
    const gravity = matterGravity * 3600;
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

    // Add brick analysis
    const reachableBricks = this.debugInfo.targetBricks.filter(
      (b) => b.reachable
    );
    const bricksWithAngles = this.debugInfo.targetBricks.filter(
      (b) => b.angles
    );

    debugText.push(`Reachable: ${reachableBricks.length}`);
    debugText.push(`Has Angles: ${bricksWithAngles.length}`);

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(5, 5, 250, debugText.length * 15 + 10);

    // Draw text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px Arial";
    debugText.forEach((text, index) => {
      ctx.fillText(text, 10, 25 + index * 15);
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
