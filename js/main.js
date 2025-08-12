// Main game class and initialization
import { CONFIG, GAME_STATES } from "./config.js";
import { PerformanceMonitor } from "./utils.js";
import Cannon from "./cannon.js";
import Castle from "./castle.js";
import PhysicsWorld from "./physics.js";
import ParticleSystem from "./particles.js";
import UpgradeManager from "./upgrades.js";
import WorldManager from "./worldManager.js";
import UIManager from "./ui.js";
import FiringTableBuilder from "./firingTableBuilder.js";
import PrestigeManager from "./prestige.js";

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
    this.prestigeManager = null;
    this.worldManager = null;
    this.ui = null;
    this.firingTableBuilder = null;

    // Cannon pause system
    this.cannonPaused = false;
    this.pauseStartTime = 0;
    this.pauseDuration = 10000; // 10 seconds default
    this.currentPauseDuration = 10000; // Actual pause duration (affected by prestige upgrades)

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
    this.prestigeManager = new PrestigeManager();
    this.upgradeManager = new UpgradeManager(this.prestigeManager);
    this.worldManager = new WorldManager();

    // Apply world settings immediately
    this.worldManager.applyWorldSettings(this.physics);

    // Create game objects
    this.cannon = new Cannon(
      CONFIG.CANNON.X,
      CONFIG.CANNON.Y,
      this.physics,
      this.particles,
      this.worldManager
    );

    // Set prestige manager reference in cannon
    this.cannon.setPrestigeManager(this.prestigeManager);

    // Only initialize UI if not in build table mode
    if (!this.worldManager.buildTableMode) {
      this.ui = new UIManager(
        this.upgradeManager,
        this.worldManager,
        (upgradeType) => this.onUpgradePurchased(upgradeType),
        this.cannon,
        this.prestigeManager
      );
      this.ui.setGame(this);
    }

    // Create castle only if not in build table mode
    if (!this.worldManager.buildTableMode) {
      this.castle = new Castle(
        CONFIG.CASTLE.X,
        CONFIG.CASTLE.Y,
        this.physics,
        this.particles,
        this.prestigeManager,
        this.upgradeManager
      );

      // Reset cannon's no-targets timer for initial castle
      this.cannon.lastTargetsFoundTime = Date.now();
    }

    // Initialize firing table builder if in build mode
    if (this.worldManager.buildTableMode) {
      this.firingTableBuilder = new FiringTableBuilder(
        this.canvas,
        this.ctx,
        this.physics,
        this.cannon,
        this.worldManager
      );

      // Start building immediately
      setTimeout(async () => {
        await this.firingTableBuilder.startBuilding();
      }, 1000); // Give a second for everything to initialize
    }

    // Apply saved upgrades to cannon
    this.applyUpgradesToCannon();

    // Start UI update loop only if UI exists
    if (this.ui) {
      this.ui.startUpdateLoop();
    }

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

  async gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update performance monitor
    this.performanceMonitor.update();

    // Update game based on state
    await this.update(deltaTime);

    // Render everything
    this.render();

    // Continue loop
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  async update(deltaTime) {
    // Update physics
    this.physics.update();

    // Update particles
    this.particles.update(deltaTime);

    // Update firing table builder if active
    if (this.firingTableBuilder) {
      this.firingTableBuilder.update();
      return; // Skip normal game logic in build mode
    }

    switch (this.gameState) {
      case GAME_STATES.PLAYING:
        await this.updatePlaying(deltaTime);
        break;

      case GAME_STATES.CASTLE_DESTROYED:
        this.updateCastleDestroyed(deltaTime);
        break;
    }

    // Add smoke trails to active cannonballs
    this.addCannonballTrails();

    // Update passive income
    this.upgradeManager.updatePassiveIncome();
  }

  async updatePlaying(deltaTime) {
    // Check if cannon pause has expired
    if (this.cannonPaused) {
      const now = Date.now();
      if (now - this.pauseStartTime >= this.currentPauseDuration) {
        this.cannonPaused = false;
      }
    }

    // Get target brick positions from castle
    const targetBricks = this.getTargetBricks();

    // Update cannon (pass pause state and target bricks)
    const cannonResult = await this.cannon.update(
      deltaTime,
      this.cannonPaused,
      targetBricks
    );

    // Check if cannon signaled to auto-destroy castle
    if (cannonResult && cannonResult.autoDestroyCastle) {
      console.log("Auto-destroying castle after 5 seconds of no targets");
      this.castle.isDestroyed = true;
      this.castle.onDestroyed();
    }

    // Debug logging for timeout status
    if (window.location.search.includes("debug")) {
      const timeSinceLastTargets =
        Date.now() - this.cannon.lastTargetsFoundTime;
      const timeSinceLastDamage = Date.now() - this.castle.lastDamageTime;

      // Log every 2 seconds
      if (
        Math.floor(timeSinceLastTargets / 2000) !==
        Math.floor((timeSinceLastTargets - deltaTime) / 2000)
      ) {
        console.log(
          `Debug timers - No targets: ${(timeSinceLastTargets / 1000).toFixed(
            1
          )}s, No damage: ${(timeSinceLastDamage / 1000).toFixed(1)}s`
        );
      }
    }

    // Update castle
    this.castle.update(deltaTime);

    // Check if castle is destroyed
    if (this.castle.isDestroyed && !this.castle.fadingOut) {
      this.gameState = GAME_STATES.CASTLE_DESTROYED;

      // Calculate pause duration with faster reload prestige upgrade
      let pauseDuration = this.pauseDuration; // Default 10 seconds
      if (this.prestigeManager) {
        const fasterReloadLevel =
          this.prestigeManager.prestigeUpgrades.fasterReload;
        const reloadReduction = fasterReloadLevel * 1000; // 1 second per level
        pauseDuration = Math.max(0, pauseDuration - reloadReduction); // Minimum 0 seconds
      }

      // Pause cannon
      this.cannonPaused = true;
      this.pauseStartTime = Date.now();
      this.currentPauseDuration = pauseDuration; // Store the actual pause duration used

      // Award money (with streak multiplier)
      const baseReward = this.castle.getReward();
      const finalReward = this.upgradeManager.earnMoney(baseReward);

      // Update world progress
      this.worldManager.onCastleDestroyed();

      // Check for world completion
      if (this.worldManager.checkWorldCompletion(this.upgradeManager)) {
        this.showWorldCompletionDialog();
      }

      // Show money earned effect
      const canvasPos = this.ui.getCanvasPosition(
        this.castle.x,
        this.castle.y - 100
      );
      this.ui.showMoneyEarned(finalReward, canvasPos.x, canvasPos.y);
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

    // Reset cannon's no-targets timer for new castle
    this.cannon.lastTargetsFoundTime = Date.now();

    // Create new castle at original position, but high in the sky
    this.castle = new Castle(
      CONFIG.CASTLE.X,
      CONFIG.CASTLE.Y - 300, // Start 300 pixels above normal position
      this.physics,
      this.particles,
      this.prestigeManager,
      this.upgradeManager
    );
  }

  showWorldCompletionDialog() {
    // Check if we can prestige (completed all worlds)
    if (this.worldManager.canPrestige()) {
      this.ui.showModal(
        "Congratulations!",
        "Congratulations, you control the entire Solar System (in this part of the Multi-verse).\n\nProceed to the next parallel universe and gain one level of Prestige, and unlock all of the cannons.\n\nNow, you will earn gems for destroying castles, which you can spend on permanent prestige upgrades. You won 50 gems. Use them well.",
        "Prestige!",
        () => {
          this.handlePrestige();
        }
      );
      return;
    }

    if (!this.worldManager.canProgressToNextWorld()) {
      return;
    }

    const currentWorld = this.worldManager.getCurrentWorld();
    const nextWorldId = this.worldManager.currentWorldId + 1;
    const nextWorld = CONFIG.WORLDS.find((w) => w.id === nextWorldId);

    if (!nextWorld) {
      // This should not happen with the prestige check above
      return;
    }

    // Show progression modal
    this.ui.showModal(
      "Congratulations!",
      `World ${currentWorld.id}: ${currentWorld.name} Complete!`,
      "Proceed to Next Level",
      () => {
        this.progressToNextWorld();
      }
    );
  }

  handlePrestige() {
    // Perform prestige
    this.prestigeManager.prestige();

    // Reset upgrades and world progress
    this.upgradeManager.resetForPrestige();
    this.worldManager.resetToWorld1();

    // Apply new world settings
    this.worldManager.applyWorldSettings(this.physics);

    // Create new castle
    this.createNewCastle();

    // Notify UI of prestige
    if (this.ui) {
      this.ui.onPrestige();
    }

    console.log(`Prestiged to level ${this.prestigeManager.prestigeLevel}!`);
  }

  progressToNextWorld() {
    const success = this.worldManager.progressToNextWorld(
      this.upgradeManager,
      this.physics
    );
    if (success) {
      // Apply upgrades to cannon
      this.applyUpgradesToCannon();

      // Update UI
      this.ui.updateStats();
      this.ui.updateAllUpgradeCards();

      // Show success message
      const newWorld = this.worldManager.getCurrentWorld();
      this.ui.showNotification(
        `Welcome to World ${newWorld.id}: ${newWorld.name}!`,
        "success"
      );

      console.log(
        `Progressed to World ${newWorld.id}: ${newWorld.name} (Gravity: ${newWorld.gravity})`
      );
    }
  }

  getTargetBricks() {
    // Extract brick positions from castle for targeting
    const targetBricks = [];

    if (this.castle && this.castle.blocks) {
      for (const block of this.castle.blocks) {
        if (!block.isDestroyed && block.body && block.body.position) {
          targetBricks.push({
            x: block.body.position.x,
            y: block.body.position.y,
          });
        }
      }
    }

    return targetBricks;
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

    // Render castle only if not in build table mode
    if (this.castle) {
      this.castle.render(this.ctx);
    }

    // Render firing table builder if active
    if (this.firingTableBuilder) {
      this.firingTableBuilder.render();
    }

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
    // Sky gradient background using world-specific colors
    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      CONFIG.CANVAS.HEIGHT
    );
    gradient.addColorStop(0, CONFIG.COLORS.SKY);
    gradient.addColorStop(0.7, CONFIG.COLORS.SKY);
    gradient.addColorStop(1, CONFIG.COLORS.GRASS);

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
      const timeRemaining =
        this.currentPauseDuration - (now - this.pauseStartTime);
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
      const progress = Math.max(0, timeRemaining / this.currentPauseDuration);

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
    let newWidth = rect.width - 40; // Leave some margin
    let newHeight = rect.height - 40; // Leave some margin

    // Calculate which dimension constrains us more
    if (newWidth / newHeight > aspectRatio) {
      // Width is not the constraint, height is
      newWidth = newHeight * aspectRatio;
    } else {
      // Height is not the constraint, width is
      newHeight = newWidth / aspectRatio;
    }

    // Ensure we don't exceed viewport bounds
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
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

  // Handle full progress reset
  resetAllProgress() {
    this.upgradeManager.resetProgress();
    this.worldManager.resetProgress();
    this.prestigeManager.resetProgress();

    // Apply world settings
    this.worldManager.applyWorldSettings(this.physics);

    // Create new castle
    this.createNewCastle();

    console.log("All progress reset!");
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
