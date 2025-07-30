// Main game class and initialization

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gameState = GAME_STATES.PLAYING;
    this.lastTime = 0;

    // Game systems
    this.physics = null;
    this.particles = null;
    this.cannon = null;
    this.castle = null;
    this.upgradeManager = null;
    this.ui = null;

    // Side-scrolling world offset
    this.worldOffsetX = 0;
    this.scrollProgress = 0;
    this.scrollDistance = 100;

    // Performance monitoring
    this.performanceMonitor = new PerformanceMonitor();

    // Initialize game
    this.init();
  }

  init() {
    // Get canvas and context
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Initialize game systems
    this.physics = new PhysicsWorld();
    this.particles = new ParticleSystem();
    this.upgradeManager = new UpgradeManager();
    this.ui = new UIManager(this.upgradeManager);

    // Create game objects
    this.cannon = new Cannon(
      CONFIG.CANNON.X,
      CONFIG.CANNON.Y,
      this.physics,
      this.particles
    );

    this.castle = new Castle(
      CONFIG.CASTLE.X,
      CONFIG.CASTLE.Y,
      this.physics,
      this.particles
    );

    // Apply saved upgrades to cannon
    this.applyUpgradesToCannon();

    // Start UI update loop
    this.ui.startUpdateLoop();

    // Start game loop
    this.gameLoop();

    console.log("Idle Cannon Game Initialized!");
  }

  applyUpgradesToCannon() {
    const upgrades = this.upgradeManager.getAllUpgradeLevels();
    for (const [type, level] of Object.entries(upgrades)) {
      this.cannon.upgrades[type] = level;
    }
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update performance monitor
    this.performanceMonitor.update();

    // Update game based on state
    this.update(deltaTime);

    // Render everything
    this.render();

    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  update(deltaTime) {
    // Update physics
    this.physics.update();

    // Update particles
    this.particles.update(deltaTime);

    switch (this.gameState) {
      case GAME_STATES.PLAYING:
        this.updatePlaying(deltaTime);
        break;

      case GAME_STATES.CASTLE_DESTROYED:
        this.updateCastleDestroyed(deltaTime);
        break;

      case GAME_STATES.MOVING_CANNON:
        this.updateMovingCannon(deltaTime);
        break;
    }

    // Add smoke trails to active cannonballs
    this.addCannonballTrails();
  }

  updatePlaying(deltaTime) {
    // Calculate current world offset for cannon firing
    let currentOffset = this.worldOffsetX;
    if (this.gameState === GAME_STATES.MOVING_CANNON) {
      const currentScroll = lerp(
        0,
        this.scrollDistance,
        Easing.easeOut(this.scrollProgress)
      );
      currentOffset += currentScroll;
    }

    // Update cannon with world offset
    this.cannon.update(deltaTime, currentOffset);

    // Update castle
    this.castle.update(deltaTime);

    // Check if castle is destroyed
    if (this.castle.isDestroyed && !this.castle.fadingOut) {
      this.gameState = GAME_STATES.CASTLE_DESTROYED;

      // Award money
      const reward = this.castle.getReward();
      this.upgradeManager.earnMoney(reward);

      // Show money earned effect
      const canvasPos = this.ui.getCanvasPosition(
        this.castle.x,
        this.castle.y - 100
      );
      this.ui.showMoneyEarned(reward, canvasPos.x, canvasPos.y);
    }
  }

  updateCastleDestroyed(deltaTime) {
    // Update castle (for fade out animation)
    this.castle.update(deltaTime);

    // Check if fade out is complete
    if (this.castle.isCompletelyDestroyed()) {
      this.gameState = GAME_STATES.MOVING_CANNON;
      this.scrollProgress = 0;
    }
  }

  updateMovingCannon(deltaTime) {
    // Scroll the world to the left (side-scroller effect)
    this.scrollProgress += deltaTime * 0.001; // 1 second to scroll

    if (this.scrollProgress >= 1.0) {
      // Scrolling complete
      this.scrollProgress = 1.0;
      this.worldOffsetX += this.scrollDistance;

      // Create new castle
      this.createNewCastle();

      // Return to playing state
      this.gameState = GAME_STATES.PLAYING;
    } else {
      // Interpolate world offset for smooth scrolling
      const currentScroll = lerp(
        0,
        this.scrollDistance,
        Easing.easeOut(this.scrollProgress)
      );
      // This will be applied in the render method
    }
  }

  createNewCastle() {
    // Clear old castle
    this.castle.clearBlocks();

    // Create new castle at original position
    this.castle = new Castle(
      CONFIG.CASTLE.X,
      CONFIG.CASTLE.Y,
      this.physics,
      this.particles
    );
  }

  addCannonballTrails() {
    // Add smoke trails to moving cannonballs
    for (const cannonballData of this.physics.cannonballs) {
      const pos = cannonballData.body.position;
      const velocity = cannonballData.body.velocity;

      // Only add trail if moving fast enough
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );
      if (speed > 50) {
        this.particles.createSmokeTrail(pos.x, pos.y);
      }
    }
  }

  render() {
    // Clear canvas with sky gradient
    this.clearCanvas();

    // Apply world offset for side-scrolling to world elements only
    this.ctx.save();

    // Calculate current scroll offset
    let currentOffset = this.worldOffsetX;
    if (this.gameState === GAME_STATES.MOVING_CANNON) {
      const currentScroll = lerp(
        0,
        this.scrollDistance,
        Easing.easeOut(this.scrollProgress)
      );
      currentOffset += currentScroll;
    }

    this.ctx.translate(-currentOffset, 0);

    // Draw ground
    this.drawGround(currentOffset);

    // Render physics bodies (cannonballs and blocks)
    this.physics.render(this.ctx);

    // Render castle (affected by world offset)
    this.castle.render(this.ctx);

    this.ctx.restore();

    // Render cannon (NOT affected by world offset - stays in fixed screen position)
    this.cannon.render(this.ctx);

    // Render particles (affected by world offset)
    this.ctx.save();
    this.ctx.translate(-currentOffset, 0);
    this.particles.render(this.ctx);
    this.ctx.restore();

    // Debug info (optional) - rendered without world offset
    if (window.location.search.includes("debug")) {
      this.renderDebugInfo();
    }
  }

  clearCanvas() {
    // Sky gradient background
    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      CONFIG.CANVAS.HEIGHT
    );
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.7, "#B0E0E6");
    gradient.addColorStop(1, "#32CD32");

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
  }

  drawGround(offsetX = 0) {
    // Draw grass ground with extended width for scrolling
    this.ctx.fillStyle = CONFIG.COLORS.GRASS;
    this.ctx.fillRect(
      -200, // Extended to left for smooth scrolling
      CONFIG.PHYSICS.GROUND_Y,
      CONFIG.CANVAS.WIDTH + 400, // Extended width
      CONFIG.CANVAS.HEIGHT - CONFIG.PHYSICS.GROUND_Y
    );

    // Add some grass texture that moves with the world
    this.ctx.fillStyle = "#228B22";
    for (let x = -200; x < CONFIG.CANVAS.WIDTH + 200; x += 20) {
      const grassHeight = Math.sin((x + offsetX) * 0.01) * 3 + 2;
      this.ctx.fillRect(
        x,
        CONFIG.PHYSICS.GROUND_Y - grassHeight,
        2,
        grassHeight
      );
    }
  }

  renderDebugInfo() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "12px Arial";
    this.ctx.fillText(`FPS: ${this.performanceMonitor.getFPS()}`, 10, 20);
    this.ctx.fillText(
      `Cannonballs: ${this.physics.cannonballs.length}`,
      10,
      35
    );
    this.ctx.fillText(`Particles: ${this.particles.particles.length}`, 10, 50);
    this.ctx.fillText(`Game State: ${this.gameState}`, 10, 65);

    // Cannon stats
    const stats = this.cannon.getStats();
    let y = 85;
    for (const [key, value] of Object.entries(stats)) {
      this.ctx.fillText(`${key}: ${value}`, 10, y);
      y += 15;
    }
  }

  // Handle window resize
  handleResize() {
    const container = document.getElementById("gameContainer");
    const rect = container.getBoundingClientRect();

    // Maintain aspect ratio
    const aspectRatio = CONFIG.CANVAS.WIDTH / CONFIG.CANVAS.HEIGHT;
    let newWidth = rect.width;
    let newHeight = rect.height;

    if (newWidth / newHeight > aspectRatio) {
      newWidth = newHeight * aspectRatio;
    } else {
      newHeight = newWidth / aspectRatio;
    }

    this.canvas.style.width = newWidth + "px";
    this.canvas.style.height = newHeight + "px";
  }

  // Handle upgrade purchase from UI
  onUpgradePurchased(upgradeType) {
    // Apply upgrade to cannon
    this.cannon.upgrades[upgradeType] =
      this.upgradeManager.getUpgradeLevel(upgradeType);

    // Show feedback
    this.ui.showNotification(
      `${this.upgradeManager.getUpgradeName(upgradeType)} upgraded!`,
      "success"
    );
  }
}

// Initialize game when page loads
window.addEventListener("DOMContentLoaded", () => {
  const game = new Game();

  // Handle window resize
  window.addEventListener("resize", () => {
    game.handleResize();
  });

  // Initial resize
  game.handleResize();

  // Make game globally accessible for debugging
  window.game = game;
});

// Handle visibility change to pause/resume
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Page is hidden, could implement pause logic here
  } else {
    // Page is visible again
  }
});
