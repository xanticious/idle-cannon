// Cannon class - handles firing logic and upgrades
import { CONFIG } from './config.js';
import { randomFloat, toDegrees, toRadians } from './utils.js';
import { calculateLaunchAngles } from './trajectoryUtils.js';

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

    // Prestige manager reference (will be set by main game)
    this.prestigeManager = null;

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
      'Cannon initialized with no-targets timeout:',
      this.noTargetsTimeout / 1000,
      'seconds'
    );
  }

  setPrestigeManager(prestigeManager) {
    this.prestigeManager = prestigeManager;
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

      if (window.location.search.includes('debug')) {
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

    // Fire main cannonball
    await this.fireCannonball(targetAngle, 'normal');

    // Handle prestige upgrades
    if (this.prestigeManager) {
      // Double Shot upgrade
      const doubleShotLevel = this.prestigeManager.prestigeUpgrades.doubleShot;
      const doubleShotChance = doubleShotLevel * 0.1; // 10% per level
      if (Math.random() < doubleShotChance && targetBricks.length > 0) {
        // Fire a second cannonball at a different valid angle
        const secondAngle = await this.calculateSmartAngle(targetBricks);
        if (secondAngle && secondAngle !== targetAngle) {
          await this.fireCannonball(secondAngle, 'double');
        }
      }

      // Blast Shot upgrade
      const blastShotLevel = this.prestigeManager.prestigeUpgrades.blastShot;
      const blastShotChance = blastShotLevel * 0.1; // 10% per level
      if (Math.random() < blastShotChance) {
        // Fire horizontal blast shot at high speed
        const blastAngle = -1 * (Math.PI / 180); // -1 degree
        await this.fireCannonball(blastAngle, 'blast');
      }

      // Fireballs upgrade
      const fireballsLevel = this.prestigeManager.prestigeUpgrades.fireballs;
      const fireballsChance = fireballsLevel * 0.1; // 10% per level
      if (Math.random() < fireballsChance) {
        // Convert the main shot to a fireball (we'll handle this in the physics)
        // The last cannonball created will be marked as a fireball
        const lastCannonball =
          this.physics.cannonballs[this.physics.cannonballs.length - 1];
        if (lastCannonball) {
          lastCannonball.isFireball = true;
        }
      }
    }

    // Visual effects (muzzle flash should be in world space since particles are rendered with world offset)
    this.recoil = 1.0;
    this.angle = -targetAngle; // Store negative angle for rendering
    this.particles.createMuzzleFlash(
      this.x + Math.cos(-targetAngle) * this.barrelLength,
      this.y + Math.sin(-targetAngle) * this.barrelLength
    );
    this.justFired = true;

    // Smoke trail will be added in the main game loop
    return null; // Normal firing, no special action needed
  }

  async fireCannonball(angle, type = 'normal') {
    // Create cannonball at barrel end
    const barrelEndX = this.x + Math.cos(-angle) * this.barrelLength;
    const barrelEndY = this.y + Math.sin(-angle) * this.barrelLength;

    // Calculate speed based on shot type
    let speed = this.getBallSpeed();
    if (type === 'blast') {
      speed *= 2.5; // Blast shot is 2.5x faster
    }

    // Calculate velocity (negative Y for upward)
    const velocity = {
      x: Math.cos(-angle) * speed,
      y: Math.sin(-angle) * speed,
    };

    // Create physics body
    const cannonball = this.physics.createCannonball(
      barrelEndX,
      barrelEndY,
      this.getBallSize(),
      CONFIG.CANNON.WEIGHT,
      velocity
    );

    // Mark special shot types
    const cannonballData =
      this.physics.cannonballs[this.physics.cannonballs.length - 1];
    if (cannonballData) {
      cannonballData.shotType = type;
    }

    return cannonball;
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

    if (window.location.search.includes('debug')) {
      if (angles) {
        console.log(
          `Found ${angles.length} valid angles for target (${endX.toFixed(
            1
          )}, ${endY.toFixed(1)}):`,
          angles.map((a) => ((a * 180) / Math.PI).toFixed(1) + '°').join(', ')
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

      if (window.location.search.includes('debug')) {
        console.log(
          `Final angle: ${((targetAngle * 180) / Math.PI).toFixed(1)}°`
        );
      }
    } else {
      console.warn(
        'No valid angles found for any target bricks, using fallback angle'
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

    // Get selected cannon type for visual styling
    const selectedCannon = this.prestigeManager
      ? this.prestigeManager.getSelectedCannon()
      : CONFIG.PRESTIGE.CANNONS[0];

    // Render based on cannon type
    this.renderCannonType(ctx, selectedCannon);

    ctx.restore();
  }

  renderCannonType(ctx, cannon) {
    switch (cannon.id) {
      case 0: // Medieval Cannon
        this.renderMedievalCannon(ctx);
        break;
      case 1: // Pirate Cannon
        this.renderPirateCannon(ctx);
        break;
      case 2: // WW1 Artillery
        this.renderWW1Artillery(ctx);
        break;
      case 3: // WW2 Tank Cannon
        this.renderWW2TankCannon(ctx);
        break;
      case 4: // Modern Tank
        this.renderModernTank(ctx);
        break;
      case 5: // Mortar
        this.renderMortar(ctx);
        break;
      case 6: // Bazooka
        this.renderBazooka(ctx);
        break;
      case 7: // Missile Launcher
        this.renderMissileLauncher(ctx);
        break;
      case 8: // Futuristic Cannon
        this.renderFuturisticCannon(ctx);
        break;
      default:
        this.renderMedievalCannon(ctx);
        break;
    }
  }

  renderMedievalCannon(ctx) {
    // Draw cannon base (wheels)
    ctx.fillStyle = '#654321';
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
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw cannon details
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-20, -10, 40, 20);

    // Draw straps/bands
    ctx.strokeStyle = '#2F2F2F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, -8);
    ctx.lineTo(25, -8);
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(-25, 8);
    ctx.lineTo(25, 8);
    ctx.stroke();
  }

  renderPirateCannon(ctx) {
    // Draw cannon base (weathered wood wheels)
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(-15, 15, 12, 0, Math.PI * 2);
    ctx.arc(15, 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Add wood grain to wheels
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(-15 + Math.cos(angle) * 8, 15 + Math.sin(angle) * 8);
      ctx.lineTo(-15 + Math.cos(angle) * 12, 15 + Math.sin(angle) * 12);
      ctx.moveTo(15 + Math.cos(angle) * 8, 15 + Math.sin(angle) * 8);
      ctx.lineTo(15 + Math.cos(angle) * 12, 15 + Math.sin(angle) * 12);
      ctx.stroke();
    }

    // Draw weathered cannon body
    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw barrel with rust spots
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#424242';
    ctx.fillRect(0, -6, this.barrelLength, 12);

    // Add rust spots
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(5, -4, 3, 2);
    ctx.fillRect(15, 2, 4, 2);
    ctx.fillRect(25, -3, 2, 3);

    // Draw barrel end
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw weathered cannon details
    ctx.fillStyle = '#795548';
    ctx.fillRect(-20, -10, 40, 20);

    // Draw rope bindings instead of metal straps
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-25, -8);
    ctx.lineTo(25, -8);
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(-25, 8);
    ctx.lineTo(25, 8);
    ctx.stroke();
  }

  renderWW1Artillery(ctx) {
    // Draw artillery wheels (side view)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(-20, 20, 15, 0, Math.PI * 2);
    ctx.arc(20, 20, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw wheel spokes
    ctx.strokeStyle = '#1B5E20';
    ctx.lineWidth = 2;
    for (let wheel of [-20, 20]) {
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(wheel, 20);
        ctx.lineTo(wheel + Math.cos(angle) * 12, 20 + Math.sin(angle) * 12);
        ctx.stroke();
      }
    }

    // Draw artillery carriage (side view)
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(-25, 5, 50, 15);

    // Draw trail (back support)
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-25, 20);
    ctx.lineTo(-45, 35);
    ctx.stroke();

    // Draw barrel
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, -8, this.barrelLength + 10, 16);

    // Draw muzzle brake
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(this.barrelLength + 5, -6, 8, 12);
    ctx.fillRect(this.barrelLength + 6, -8, 2, 16);
    ctx.fillRect(this.barrelLength + 9, -8, 2, 16);

    ctx.restore();

    // Draw gun shield
    ctx.fillStyle = '#388E3C';
    ctx.fillRect(-15, -20, 30, 25);

    // Draw military star on gun shield
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const starSize = 6;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * starSize;
      const y = -8 + Math.sin(angle) * starSize;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw elevation mechanism
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(0, 5, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  renderWW2TankCannon(ctx) {
    // Draw tank hull (side view)
    ctx.fillStyle = '#616161';
    ctx.fillRect(-35, 0, 70, 25);

    // Draw lower hull armor
    ctx.fillStyle = '#424242';
    ctx.fillRect(-35, 20, 70, 8);

    // Draw drive sprocket and idler wheel
    ctx.fillStyle = '#757575';
    ctx.beginPath();
    ctx.arc(-25, 22, 8, 0, Math.PI * 2);
    ctx.arc(25, 22, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw road wheels
    ctx.fillStyle = '#424242';
    for (let i = -15; i <= 15; i += 10) {
      ctx.beginPath();
      ctx.arc(i, 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw simplified track
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Half circle from top of left wheel to bottom of left wheel (counter clockwise)
    ctx.arc(-25, 21, 11, -Math.PI / 2, Math.PI / 2, true);
    // Horizontal line on the ground to the bottom of the right wheel
    ctx.lineTo(25, 32);
    // Half circle from bottom of right wheel to top of right wheel (counter clockwise)
    ctx.arc(25, 21, 11, Math.PI / 2, -Math.PI / 2, true);
    // Horizontal line at above wheel height going back to the start
    ctx.lineTo(-25, 10);
    ctx.closePath();
    ctx.stroke();

    // Draw track links/pads
    ctx.fillStyle = '#1A1A1A';
    ctx.lineWidth = 1;
    // Top track pads
    for (let x = -22; x <= 22; x += 4) {
      ctx.fillRect(x, 10, 3, 2);
    }
    // Bottom track pads
    for (let x = -22; x <= 22; x += 4) {
      ctx.fillRect(x, 32, 3, 2);
    }

    // Draw turret (side view)
    ctx.fillStyle = '#757575';
    ctx.fillRect(-25, -15, 50, 20);

    // Draw turret armor slope
    ctx.beginPath();
    ctx.moveTo(-25, -15);
    ctx.lineTo(-15, -20);
    ctx.lineTo(15, -20);
    ctx.lineTo(25, -15);
    ctx.lineTo(25, 5);
    ctx.lineTo(-25, 5);
    ctx.closePath();
    ctx.fill();

    // Draw armor details
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.strokeRect(-25, -15, 50, 20);

    // Draw barrel
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#757575';
    ctx.fillRect(0, -6, this.barrelLength + 15, 12);

    // Draw barrel bore evacuator
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(this.barrelLength * 0.7, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw muzzle
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(this.barrelLength + 15, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw commander's cupola
    ctx.fillStyle = '#616161';
    ctx.beginPath();
    ctx.arc(10, -15, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw vision ports
    ctx.fillStyle = '#212121';
    ctx.fillRect(-20, -12, 3, 2);
    ctx.fillRect(-10, -12, 3, 2);
    ctx.fillRect(5, -12, 3, 2);

    // Draw antenna
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(15, -20);
    ctx.lineTo(18, -30);
    ctx.stroke();
  }

  renderModernTank(ctx) {
    // Draw tank hull (side view)
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(-40, 0, 80, 25);

    // Draw lower hull with sloped armor
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(-30, -5);
    ctx.lineTo(30, -5);
    ctx.lineTo(40, 0);
    ctx.lineTo(40, 25);
    ctx.lineTo(-40, 25);
    ctx.closePath();
    ctx.fill();

    // Add desert camo pattern to hull
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-35, 2, 15, 8);
    ctx.fillRect(-10, 5, 20, 6);
    ctx.fillRect(15, 3, 12, 7);

    ctx.fillStyle = '#A1887F';
    ctx.fillRect(-25, 12, 10, 5);
    ctx.fillRect(5, 15, 8, 4);
    ctx.fillRect(25, 10, 10, 6);

    // Draw drive sprocket and idler wheel
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.arc(-30, 22, 10, 0, Math.PI * 2);
    ctx.arc(30, 22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Draw road wheels
    ctx.fillStyle = '#424242';
    for (let i = -20; i <= 20; i += 10) {
      ctx.beginPath();
      ctx.arc(i, 24, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw simplified track
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Half circle from top of left wheel to bottom of left wheel (counter clockwise)
    ctx.arc(-30, 24, 10, -Math.PI / 2, Math.PI / 2, true);
    // Horizontal line on the ground to the bottom of the right wheel
    ctx.lineTo(30, 34);
    // Half circle from bottom of right wheel to top of right wheel (counter clockwise)
    ctx.arc(30, 24, 10, Math.PI / 2, -Math.PI / 2, true);
    // Horizontal line at above wheel height going back to the start
    ctx.lineTo(-30, 14);
    ctx.closePath();
    ctx.stroke();

    // Draw track links/pads (rubber pads for modern tank)
    ctx.fillStyle = '#1A1A1A';
    // Top track pads
    for (let x = -27; x <= 27; x += 5) {
      ctx.fillRect(x, 11, 4, 2);
    }
    // Bottom track pads
    for (let x = -27; x <= 27; x += 5) {
      ctx.fillRect(x, 35, 4, 2);
    }

    // Draw turret (side view)
    ctx.fillStyle = '#D7CCC8';
    ctx.fillRect(-30, -18, 60, 22);

    // Draw turret armor slope
    ctx.beginPath();
    ctx.moveTo(-30, -18);
    ctx.lineTo(-20, -25);
    ctx.lineTo(20, -25);
    ctx.lineTo(30, -18);
    ctx.lineTo(30, 4);
    ctx.lineTo(-30, 4);
    ctx.closePath();
    ctx.fill();

    // Add camo pattern to turret
    ctx.fillStyle = '#A1887F';
    ctx.fillRect(-25, -15, 12, 8);
    ctx.fillRect(5, -20, 15, 6);
    ctx.fillRect(-10, -8, 8, 5);

    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(-15, -22, 8, 4);
    ctx.fillRect(10, -12, 12, 7);
    ctx.fillRect(-5, 0, 6, 3);

    // Draw barrel with thermal sleeve
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#616161';
    ctx.fillRect(0, -7, this.barrelLength + 12, 14);

    // Draw thermal sleeve
    ctx.fillStyle = '#424242';
    ctx.fillRect(8, -5, this.barrelLength - 12, 10);

    // Draw muzzle reference system
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(this.barrelLength + 12, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw commander's independent thermal viewer
    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.arc(15, -20, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw laser rangefinder
    ctx.fillStyle = '#424242';
    ctx.fillRect(-5, -22, 8, 4);

    // Draw reactive armor blocks
    ctx.fillStyle = '#616161';
    ctx.fillRect(-35, -5, 8, 8);
    ctx.fillRect(-15, -8, 6, 6);
    ctx.fillRect(20, -10, 7, 7);

    // Draw communication antenna
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, -25);
    ctx.lineTo(28, -35);
    ctx.stroke();
  }

  renderMortar(ctx) {
    // Draw simple tripod base
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(-20, 25);
    ctx.moveTo(0, 15);
    ctx.lineTo(20, 25);
    ctx.moveTo(0, 15);
    ctx.lineTo(0, 25);
    ctx.stroke();

    // Draw tripod feet
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(-20, 25, 3, 0, Math.PI * 2);
    ctx.arc(20, 25, 3, 0, Math.PI * 2);
    ctx.arc(0, 25, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw compact mortar tube
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#616161';
    ctx.fillRect(0, -8, this.barrelLength * 0.8, 16);

    // Draw mortar muzzle
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(this.barrelLength * 0.8, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw mortar base plate
    ctx.fillStyle = '#757575';
    ctx.fillRect(-15, -8, 30, 16);

    // Draw elevation mechanism
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  renderBazooka(ctx) {
    // Draw stick figure person holding bazooka

    // Draw legs
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-30, 25); // left foot
    ctx.lineTo(-25, 15); // left knee
    ctx.lineTo(-20, 5); // hip
    ctx.lineTo(-15, 15); // right knee
    ctx.lineTo(-10, 25); // right foot
    ctx.stroke();

    // Draw body
    ctx.beginPath();
    ctx.moveTo(-20, 5); // hip
    ctx.lineTo(-20, -10); // shoulder
    ctx.stroke();

    // Draw head
    // ctx.fillStyle = '#FFDBAC';
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(-20, -15, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw left arm (supporting bazooka)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -8); // shoulder
    ctx.lineTo(-15, -5); // elbow
    ctx.lineTo(-10, -2); // hand supporting bazooka
    ctx.stroke();

    // Draw right arm (holding grip)
    ctx.beginPath();
    ctx.moveTo(-20, -8); // shoulder
    ctx.lineTo(-25, -5); // elbow
    ctx.lineTo(-28, 2); // hand on grip
    ctx.stroke();

    // Draw bazooka tube
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, -6, this.barrelLength, 12);

    // Draw rear exhaust
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(-10, -4, 8, 8);

    // Draw front sight
    ctx.fillStyle = '#212121';
    ctx.fillRect(this.barrelLength - 5, -2, 3, 4);

    // Draw muzzle
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw grip
    ctx.fillStyle = '#2E2E2E';
    ctx.fillRect(-30, 0, 6, 8);

    // Draw trigger guard
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-27, 6, 3, 0, Math.PI);
    ctx.stroke();
  }

  renderMissileLauncher(ctx) {
    // Draw launcher platform
    ctx.fillStyle = '#37474F';
    ctx.fillRect(-30, 8, 60, 15);

    // Draw hydraulic supports
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, 23);
    ctx.lineTo(-15, 8);
    ctx.moveTo(15, 23);
    ctx.lineTo(15, 8);
    ctx.stroke();

    // Draw launcher tube
    ctx.save();
    ctx.rotate(this.angle);
    ctx.fillStyle = '#546E7A';
    ctx.fillRect(0, -10, this.barrelLength + 20, 20);

    // Draw missile guidance fins
    ctx.fillStyle = '#37474F';
    ctx.fillRect(this.barrelLength + 10, -12, 15, 4);
    ctx.fillRect(this.barrelLength + 10, 8, 15, 4);

    // Draw missile nose cone
    ctx.fillStyle = '#FF5722';
    ctx.beginPath();
    ctx.moveTo(this.barrelLength + 20, 0);
    ctx.lineTo(this.barrelLength + 30, -5);
    ctx.lineTo(this.barrelLength + 30, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw control unit
    ctx.fillStyle = '#455A64';
    ctx.fillRect(-20, -15, 40, 20);

    // Draw radar dish
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -5, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderFuturisticCannon(ctx) {
    // Draw energy core base
    ctx.fillStyle = '#1A237E';
    ctx.beginPath();
    ctx.arc(0, 15, 18, 0, Math.PI * 2);
    ctx.fill();

    // Draw energy rings
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 15, 12 + i * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw plasma cannon body
    ctx.fillStyle = '#283593';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Add energy conduits
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, -5);
    ctx.lineTo(this.width / 2, -5);
    ctx.moveTo(-this.width / 2, 5);
    ctx.lineTo(this.width / 2, 5);
    ctx.stroke();

    // Draw plasma barrel
    ctx.save();
    ctx.rotate(this.angle);

    // Outer barrel
    ctx.fillStyle = '#3F51B5';
    ctx.fillRect(0, -8, this.barrelLength, 16);

    // Inner energy channel
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(2, -4, this.barrelLength - 4, 8);

    // Energy focusing rings
    ctx.strokeStyle = '#E1F5FE';
    ctx.lineWidth = 2;
    for (let i = 10; i < this.barrelLength; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i, -6);
      ctx.lineTo(i, 6);
      ctx.stroke();
    }

    // Plasma emitter
    ctx.fillStyle = '#00BCD4';
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Plasma glow effect
    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(this.barrelLength, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw energy core
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Add pulsing energy effect
    const pulseTime = Date.now() * 0.01;
    const pulse = Math.sin(pulseTime) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(0, 229, 255, ${pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
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
