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
  }

  update(deltaTime, isPaused = false) {
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
      this.fire();
      this.lastShot = now;
      this.justFired = true;
    }
  }

  fire() {
    // Generate random angle between MIN_ANGLE and MAX_ANGLE
    const randomAngle =
      CONFIG.CANNON.MIN_ANGLE +
      Math.random() * (CONFIG.CANNON.MAX_ANGLE - CONFIG.CANNON.MIN_ANGLE);

    // Create cannonball at barrel end
    const barrelEndX = this.x + Math.cos(-randomAngle) * this.barrelLength;
    const barrelEndY = this.y + Math.sin(-randomAngle) * this.barrelLength;

    // Randomize speed and weight for each shot
    const randomSpeed =
      CONFIG.CANNON.SPEED_MIN +
      Math.random() * (CONFIG.CANNON.SPEED_MAX - CONFIG.CANNON.SPEED_MIN);
    const randomWeight =
      CONFIG.CANNON.WEIGHT_MIN +
      Math.random() * (CONFIG.CANNON.WEIGHT_MAX - CONFIG.CANNON.WEIGHT_MIN);

    // Calculate velocity (negative Y for upward)
    const velocity = {
      x: Math.cos(-randomAngle) * randomSpeed,
      y: Math.sin(-randomAngle) * randomSpeed,
    };

    // Create physics body with randomized values
    this.physics.createCannonball(
      barrelEndX,
      barrelEndY,
      this.getBallSize(),
      randomWeight,
      velocity
    );

    // Visual effects (muzzle flash should be in world space since particles are rendered with world offset)
    this.recoil = 1.0;
    this.angle = -randomAngle; // Store negative angle for rendering
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
