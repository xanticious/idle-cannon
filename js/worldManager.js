// World progression system management
import { CONFIG } from "./config.js";

class WorldManager {
  constructor() {
    this.currentWorldId = 1;
    this.castlesDestroyedInCurrentWorld = 0;
    this.isReadyForNextWorld = false;
    this.buildTableMode = false;

    // Load saved data if available
    this.loadProgress();

    // Check for world parameter in URL
    this.checkWorldParameter();

    // Check for buildTable parameter
    this.checkBuildTableParameter();
  }

  checkWorldParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const worldParam = urlParams.get("world");
    if (worldParam) {
      const worldId = parseInt(worldParam);
      if (worldId >= 1 && worldId <= CONFIG.WORLDS.length) {
        this.currentWorldId = worldId;
        console.log(
          `Debug: Switched to World ${worldId}: ${this.getCurrentWorld().name}`
        );
      }
    }
  }

  checkBuildTableParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const buildTableParam = urlParams.get("buildTable");
    if (buildTableParam === "true") {
      this.buildTableMode = true;
      console.log("Debug: Entering firing table build mode");
    }
  }

  getCurrentWorld() {
    return (
      CONFIG.WORLDS.find((world) => world.id === this.currentWorldId) ||
      CONFIG.WORLDS[0]
    );
  }

  getCurrentWorldColors() {
    return this.getCurrentWorld().colors;
  }

  getCurrentGravity() {
    return this.getCurrentWorld().gravity;
  }

  onCastleDestroyed() {
    this.castlesDestroyedInCurrentWorld++;
    this.saveProgress();
  }

  checkWorldCompletion(upgradeManager) {
    const currentWorld = this.getCurrentWorld();
    const upgrades = upgradeManager.getAllUpgradeLevels();

    // Check if all upgrades are maxed
    const fireRateMaxed =
      upgrades.fireRate >= CONFIG.UPGRADES.LEVEL_CAPS.fireRate;
    const sizeMaxed = upgrades.size >= CONFIG.UPGRADES.LEVEL_CAPS.size;
    const upgradesMaxed = fireRateMaxed && sizeMaxed;

    // Check if enough castles destroyed after maxing upgrades
    const enoughCastles =
      this.castlesDestroyedInCurrentWorld >= currentWorld.completionRequired;

    this.isReadyForNextWorld = upgradesMaxed && enoughCastles;
    return this.isReadyForNextWorld;
  }

  canProgressToNextWorld() {
    return (
      this.isReadyForNextWorld && this.currentWorldId < CONFIG.WORLDS.length
    );
  }

  progressToNextWorld(upgradeManager, physicsWorld) {
    if (!this.canProgressToNextWorld()) {
      return false;
    }

    this.currentWorldId++;
    this.castlesDestroyedInCurrentWorld = 0;
    this.isReadyForNextWorld = false;

    // Reset upgrades to level 0
    upgradeManager.resetUpgradesForNewWorld();

    // Apply new world settings
    this.applyWorldSettings(physicsWorld);

    this.saveProgress();
    return true;
  }

  applyWorldSettings(physicsWorld) {
    const world = this.getCurrentWorld();

    // Update physics gravity
    if (physicsWorld && physicsWorld.engine) {
      physicsWorld.engine.world.gravity.y = world.gravity;
    }

    // Update color constants for immediate use
    const colors = world.colors;
    CONFIG.COLORS.SKY = colors.sky;
    CONFIG.COLORS.GRASS = colors.grass;
    CONFIG.COLORS.WOOD = colors.wood;
    CONFIG.COLORS.STONE = colors.stone;

    // Update HTML body and canvas background to match world theme
    this.updateHTMLBackground(colors);
  }

  updateHTMLBackground(colors) {
    // Update body background gradient
    document.body.style.background = `linear-gradient(to bottom, ${colors.sky} 0%, ${colors.grass} 100%)`;

    // Update canvas background gradient
    const canvas = document.getElementById("gameCanvas");
    if (canvas) {
      canvas.style.background = `linear-gradient(to bottom, ${colors.sky} 0%, ${colors.grass} 80%)`;
    }
  }

  getWorldProgressText() {
    const currentWorld = this.getCurrentWorld();
    return `World ${this.currentWorldId}: ${currentWorld.name}`;
  }

  getCompletionProgressText(upgradeManager) {
    const currentWorld = this.getCurrentWorld();
    const upgrades = upgradeManager.getAllUpgradeLevels();

    const fireRateMaxed =
      upgrades.fireRate >= CONFIG.UPGRADES.LEVEL_CAPS.fireRate;
    const sizeMaxed = upgrades.size >= CONFIG.UPGRADES.LEVEL_CAPS.size;
    const upgradesMaxed = fireRateMaxed && sizeMaxed;

    if (!upgradesMaxed) {
      return "Max all upgrades to unlock world progression";
    }

    const remaining = Math.max(
      0,
      currentWorld.completionRequired - this.castlesDestroyedInCurrentWorld
    );
    if (remaining > 0) {
      return `Destroy ${remaining} more castles to complete this world`;
    }

    if (this.currentWorldId < CONFIG.WORLDS.length) {
      return "Ready to progress to next world!";
    } else {
      return "All worlds completed! (Prestige coming soon...)";
    }
  }

  saveProgress() {
    const saveData = {
      currentWorldId: this.currentWorldId,
      castlesDestroyedInCurrentWorld: this.castlesDestroyedInCurrentWorld,
      isReadyForNextWorld: this.isReadyForNextWorld,
    };

    try {
      localStorage.setItem("idleCannon_world", JSON.stringify(saveData));
    } catch (e) {
      console.warn("Failed to save world progress:", e);
    }
  }

  loadProgress() {
    try {
      const saveData = localStorage.getItem("idleCannon_world");
      if (saveData) {
        const data = JSON.parse(saveData);
        this.currentWorldId = data.currentWorldId || 1;
        this.castlesDestroyedInCurrentWorld =
          data.castlesDestroyedInCurrentWorld || 0;
        this.isReadyForNextWorld = data.isReadyForNextWorld || false;
      }
    } catch (e) {
      console.warn("Failed to load world progress:", e);
    }
  }

  resetProgress() {
    this.currentWorldId = 1;
    this.castlesDestroyedInCurrentWorld = 0;
    this.isReadyForNextWorld = false;

    try {
      localStorage.removeItem("idleCannon_world");
    } catch (e) {
      console.warn("Failed to clear world save data:", e);
    }
  }
}

export default WorldManager;
