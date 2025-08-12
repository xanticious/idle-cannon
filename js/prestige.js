// Prestige system management
import { CONFIG } from "./config.js";
import { formatNumber } from "./utils.js";

class PrestigeManager {
  constructor() {
    this.prestigeLevel = 0;
    this.gems = 0;
    this.selectedCannonId = 0; // Default to medieval cannon

    // Prestige upgrades levels
    this.prestigeUpgrades = {
      doubleShot: 0,
      fasterReload: 0,
      blastShot: 0,
      fireballs: 0,
      betterCastles: 0,
      passiveIncome: 0,
    };

    // Load saved data if available
    this.loadProgress();

    // Check for god mode parameters
    this.checkGodMode();
  }

  checkGodMode() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for prestige parameter
    const prestigeParam = urlParams.get("prestige");
    if (prestigeParam) {
      const prestigeLevel = parseInt(prestigeParam, 10);
      if (!isNaN(prestigeLevel) && prestigeLevel >= 0) {
        this.prestigeLevel = prestigeLevel;
        console.log(`Starting with prestige level: ${prestigeLevel}`);
      }
    }

    // Check for gems parameter
    const gemsParam = urlParams.get("gems");
    if (gemsParam) {
      const startingGems = parseInt(gemsParam, 10);
      if (!isNaN(startingGems) && startingGems >= 0) {
        this.gems = startingGems;
        console.log(`Starting with gems: ${formatNumber(startingGems)}`);
      }
    }
  }

  canPrestige() {
    return this.prestigeLevel > 0 || this.hasCompletedAllWorlds;
  }

  prestige() {
    this.prestigeLevel++;

    // Award gems - 50 for first prestige, then 1 per castle destroyed going forward
    if (this.prestigeLevel === 1) {
      this.gems += CONFIG.PRESTIGE.BASE_GEM_REWARD;
    }

    this.saveProgress();
    return this.prestigeLevel;
  }

  earnGems(amount = CONFIG.PRESTIGE.GEM_PER_CASTLE) {
    // Only earn gems after first prestige
    if (this.prestigeLevel > 0) {
      this.gems += amount;
      this.saveProgress();
    }
  }

  getPrestigeUpgradeCost(upgradeType) {
    const currentLevel = this.prestigeUpgrades[upgradeType];
    return (
      CONFIG.PRESTIGE.UPGRADE_BASE_COST *
      Math.pow(CONFIG.PRESTIGE.UPGRADE_COST_MULTIPLIER, currentLevel)
    );
  }

  canAffordPrestigeUpgrade(upgradeType) {
    return (
      this.gems >= this.getPrestigeUpgradeCost(upgradeType) &&
      !this.isPrestigeUpgradeMaxed(upgradeType)
    );
  }

  isPrestigeUpgradeMaxed(upgradeType) {
    const levelCap = CONFIG.PRESTIGE.UPGRADE_LEVEL_CAPS[upgradeType];
    return levelCap && this.prestigeUpgrades[upgradeType] >= levelCap;
  }

  purchasePrestigeUpgrade(upgradeType) {
    if (
      !this.canAffordPrestigeUpgrade(upgradeType) ||
      this.isPrestigeUpgradeMaxed(upgradeType)
    ) {
      return false;
    }

    const cost = this.getPrestigeUpgradeCost(upgradeType);
    this.gems -= cost;
    this.prestigeUpgrades[upgradeType]++;

    this.saveProgress();
    return true;
  }

  getIncomeMultiplier() {
    // 10% bonus per prestige level
    return 1 + this.prestigeLevel * CONFIG.PRESTIGE.INCOME_BONUS_PER_LEVEL;
  }

  getUnlockedCannons() {
    return CONFIG.PRESTIGE.CANNONS.filter(
      (cannon) =>
        cannon.unlocked ||
        (cannon.prestigeLevel && cannon.prestigeLevel <= this.prestigeLevel)
    );
  }

  selectCannon(cannonId) {
    const cannon = CONFIG.PRESTIGE.CANNONS.find((c) => c.id === cannonId);
    if (
      cannon &&
      (cannon.unlocked ||
        (cannon.prestigeLevel && cannon.prestigeLevel <= this.prestigeLevel))
    ) {
      this.selectedCannonId = cannonId;
      this.saveProgress();
      return true;
    }
    return false;
  }

  getSelectedCannon() {
    return (
      CONFIG.PRESTIGE.CANNONS.find((c) => c.id === this.selectedCannonId) ||
      CONFIG.PRESTIGE.CANNONS[0]
    );
  }

  getPrestigeUpgradeInfo(upgradeType) {
    const level = this.prestigeUpgrades[upgradeType];
    const levelCap = CONFIG.PRESTIGE.UPGRADE_LEVEL_CAPS[upgradeType];
    const isMaxed = this.isPrestigeUpgradeMaxed(upgradeType);
    const cost = isMaxed ? 0 : this.getPrestigeUpgradeCost(upgradeType);
    const canAfford = this.canAffordPrestigeUpgrade(upgradeType);
    const upgradeConfig = CONFIG.PRESTIGE.UPGRADES[upgradeType];

    return {
      type: upgradeType,
      name: upgradeConfig.name,
      description: upgradeConfig.description,
      level: level,
      levelCap: levelCap,
      isMaxed: isMaxed,
      cost: cost,
      costFormatted: isMaxed ? "MAXED" : formatNumber(cost),
      canAfford: canAfford,
    };
  }

  getAllPrestigeUpgradeInfo() {
    const upgrades = {};
    for (const upgradeType of Object.keys(this.prestigeUpgrades)) {
      upgrades[upgradeType] = this.getPrestigeUpgradeInfo(upgradeType);
    }
    return upgrades;
  }

  resetPrestigeUpgrades() {
    // Only reset prestige upgrades on full reset, not on prestige
    this.prestigeUpgrades = {
      doubleShot: 0,
      fasterReload: 0,
      blastShot: 0,
      fireballs: 0,
      betterCastles: 0,
      passiveIncome: 0,
    };
  }

  resetProgress() {
    this.prestigeLevel = 0;
    this.gems = 0;
    this.selectedCannonId = 0;
    this.resetPrestigeUpgrades();

    try {
      localStorage.removeItem("idleCannon_prestige");
    } catch (e) {
      console.warn("Failed to clear prestige save data:", e);
    }
  }

  saveProgress() {
    const saveData = {
      prestigeLevel: this.prestigeLevel,
      gems: this.gems,
      selectedCannonId: this.selectedCannonId,
      prestigeUpgrades: this.prestigeUpgrades,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem("idleCannon_prestige", JSON.stringify(saveData));
    } catch (e) {
      console.warn("Failed to save prestige progress:", e);
    }
  }

  loadProgress() {
    try {
      const saveData = localStorage.getItem("idleCannon_prestige");
      if (saveData) {
        const data = JSON.parse(saveData);
        this.prestigeLevel = data.prestigeLevel || 0;
        this.gems = data.gems || 0;
        this.selectedCannonId = data.selectedCannonId || 0;
        this.prestigeUpgrades = {
          doubleShot: data.prestigeUpgrades.doubleShot || 0,
          fasterReload: data.prestigeUpgrades.fasterReload || 0,
          blastShot: data.prestigeUpgrades.blastShot || 0,
          fireballs: data.prestigeUpgrades.fireballs || 0,
          betterCastles: data.prestigeUpgrades.betterCastles || 0,
          passiveIncome: data.prestigeUpgrades.passiveIncome || 0,
        };
      }
    } catch (e) {
      console.warn("Failed to load prestige progress:", e);
    }
  }

  getDisplayValues() {
    return {
      prestigeLevel: this.prestigeLevel,
      gems: formatNumber(this.gems),
      selectedCannon: this.getSelectedCannon(),
    };
  }
}

export default PrestigeManager;
