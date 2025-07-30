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

    // Cannon pause system
    this.cannonPaused = false;
    this.pauseStartTime = 0;
    this.pauseDuration = 10000; // 10 seconds

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
    this.ui = new UIManager(this.upgradeManager, (upgradeType) =>
      this.onUpgradePurchased(upgradeType)
    );

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
    }

    // Add smoke trails to active cannonballs
    this.addCannonballTrails();
  }

  updatePlaying(deltaTime) {
    // Check if cannon pause has expired
    if (this.cannonPaused) {
      const now = Date.now();
      if (now - this.pauseStartTime >= this.pauseDuration) {
        this.cannonPaused = false;
      }
    }

    // Update cannon (pass pause state)
    this.cannon.update(deltaTime, this.cannonPaused);

    // Update castle
    this.castle.update(deltaTime);

    // Check if castle is destroyed
    if (this.castle.isDestroyed && !this.castle.fadingOut) {
      this.gameState = GAME_STATES.CASTLE_DESTROYED;

      // Pause cannon for 10 seconds
      this.cannonPaused = true;
      this.pauseStartTime = Date.now();

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
      // Create new castle immediately (it will drop from sky)
      this.createNewCastle();

      // Return to playing state
      this.gameState = GAME_STATES.PLAYING;
    }
  }

  createNewCastle() {
    // Clear old castle
    this.castle.clearBlocks();

    // Clear all remaining cannonballs
    this.physics.clearAllCannonballs();

    // Create new castle at original position, but high in the sky
    this.castle = new Castle(
      CONFIG.CASTLE.X,
      CONFIG.CASTLE.Y - 300, // Start 300 pixels above normal position
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

    // Draw ground
    this.drawGround();

    // Render physics bodies (cannonballs and blocks)
    this.physics.render(this.ctx);

    // Render game objects
    this.cannon.render(this.ctx);
    this.castle.render(this.ctx);

    // Render particles
    this.particles.render(this.ctx);

    // Show cannon pause indicator
    this.renderCannonPauseIndicator();

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

  drawGround() {
    // Draw grass ground
    this.ctx.fillStyle = CONFIG.COLORS.GRASS;
    this.ctx.fillRect(
      0,
      CONFIG.PHYSICS.GROUND_Y,
      CONFIG.CANVAS.WIDTH,
      CONFIG.CANVAS.HEIGHT - CONFIG.PHYSICS.GROUND_Y
    );

    // Add some grass texture
    this.ctx.fillStyle = "#228B22";
    for (let x = 0; x < CONFIG.CANVAS.WIDTH; x += 20) {
      const grassHeight = Math.sin(x * 0.01) * 3 + 2;
      this.ctx.fillRect(
        x,
        CONFIG.PHYSICS.GROUND_Y - grassHeight,
        2,
        grassHeight
      );
    }
  }

  renderCannonPauseIndicator() {
    if (this.cannonPaused) {
      const now = Date.now();
      const timeRemaining = this.pauseDuration - (now - this.pauseStartTime);
      const secondsRemaining = Math.ceil(timeRemaining / 1000);

      this.ctx.save();

      // Draw pause indicator near cannon
      this.ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
      this.ctx.font = "16px Arial";
      this.ctx.textAlign = "center";

      const text = `CANNON RELOADING: ${secondsRemaining}s`;
      this.ctx.fillText(text, CONFIG.CANNON.X, CONFIG.CANNON.Y - 60);

      // Draw progress bar
      const barWidth = 100;
      const barHeight = 8;
      const progress = Math.max(0, timeRemaining / this.pauseDuration);

      // Background bar
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(
        CONFIG.CANNON.X - barWidth / 2,
        CONFIG.CANNON.Y - 40,
        barWidth,
        barHeight
      );

      // Progress bar
      this.ctx.fillStyle = "rgba(255, 100, 100, 0.9)";
      this.ctx.fillRect(
        CONFIG.CANNON.X - barWidth / 2,
        CONFIG.CANNON.Y - 40,
        barWidth * progress,
        barHeight
      );

      this.ctx.restore();
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
