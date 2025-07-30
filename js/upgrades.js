// Upgrade system and economy management

class UpgradeManager {
  constructor() {
    this.money = 0;
    this.totalEarned = 0;
    this.castlesDestroyed = 0;
    this.incomeRate = 0;
    this.lastIncomeUpdate = Date.now();
    this.recentEarnings = [];

    // Upgrade levels
    this.upgrades = {
      fireRate: 0,
      size: 0,
    };

    // Load saved data if available
    this.loadProgress();

    // Check for god mode
    this.checkGodMode();
  }

  checkGodMode() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("godmode") === "true") {
      this.money = 10000000000; // $10 billion
      this.totalEarned = 10000000000;
      console.log("God mode activated! Starting with $10 billion");
    }
  }

  earnMoney(amount) {
    this.money += amount;
    this.totalEarned += amount;
    this.castlesDestroyed++;

    // Track for income rate calculation
    this.recentEarnings.push({
      amount: amount,
      timestamp: Date.now(),
    });

    // Keep only earnings from last 2 minutes for rate calculation
    const twoMinutesAgo = Date.now() - 120000;
    this.recentEarnings = this.recentEarnings.filter(
      (earning) => earning.timestamp > twoMinutesAgo
    );

    this.updateIncomeRate();
    this.saveProgress();
  }

  updateIncomeRate() {
    if (this.recentEarnings.length < 2) {
      this.incomeRate = 0;
      return;
    }

    // Calculate earnings per minute from recent data
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentMinuteEarnings = this.recentEarnings
      .filter((earning) => earning.timestamp > oneMinuteAgo)
      .reduce((sum, earning) => sum + earning.amount, 0);

    this.incomeRate = recentMinuteEarnings;
  }

  getUpgradeCost(upgradeType) {
    const baseCost = CONFIG.UPGRADES.BASE_COSTS[upgradeType];
    const currentLevel = this.upgrades[upgradeType];
    return Math.floor(
      baseCost * Math.pow(CONFIG.UPGRADES.COST_MULTIPLIER, currentLevel)
    );
  }

  canAfford(upgradeType) {
    return this.money >= this.getUpgradeCost(upgradeType);
  }

  purchaseUpgrade(upgradeType) {
    if (!this.canAfford(upgradeType)) {
      return false;
    }

    const cost = this.getUpgradeCost(upgradeType);
    this.money -= cost;
    this.upgrades[upgradeType]++;

    this.saveProgress();
    return true;
  }

  getUpgradeLevel(upgradeType) {
    return this.upgrades[upgradeType];
  }

  getAllUpgradeLevels() {
    return { ...this.upgrades };
  }

  // Save progress to localStorage
  saveProgress() {
    const saveData = {
      money: this.money,
      totalEarned: this.totalEarned,
      castlesDestroyed: this.castlesDestroyed,
      upgrades: this.upgrades,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem("idleCannon_save", JSON.stringify(saveData));
    } catch (e) {
      console.warn("Failed to save progress:", e);
    }
  }

  // Load progress from localStorage
  loadProgress() {
    try {
      const saveData = localStorage.getItem("idleCannon_save");
      if (saveData) {
        const data = JSON.parse(saveData);

        this.money = data.money || 0;
        this.totalEarned = data.totalEarned || 0;
        this.castlesDestroyed = data.castlesDestroyed || 0;
        this.upgrades = { ...this.upgrades, ...data.upgrades };

        // Calculate offline earnings (simple version)
        if (data.timestamp) {
          const offlineTime = Date.now() - data.timestamp;
          const offlineHours = offlineTime / (1000 * 60 * 60);

          if (offlineHours > 0.1 && offlineHours < 24) {
            // Give some offline earnings based on last known income rate
            const offlineEarnings = Math.floor(
              this.incomeRate * (offlineHours * 60) * 0.1
            );
            if (offlineEarnings > 0) {
              this.money += offlineEarnings;
              this.totalEarned += offlineEarnings;
              this.showOfflineEarnings(offlineEarnings, offlineHours);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load progress:", e);
    }
  }

  showOfflineEarnings(earnings, hours) {
    // This could show a popup or notification
    console.log(
      `Welcome back! You earned $${formatNumber(
        earnings
      )} while away for ${hours.toFixed(1)} hours.`
    );
  }

  // Reset all progress
  resetProgress() {
    this.money = 0;
    this.totalEarned = 0;
    this.castlesDestroyed = 0;
    this.incomeRate = 0;
    this.recentEarnings = [];

    this.upgrades = {
      fireRate: 0,
      size: 0,
      speed: 0,
      accuracy: 0,
    };

    try {
      localStorage.removeItem("idleCannon_save");
    } catch (e) {
      console.warn("Failed to clear save data:", e);
    }
  }

  // Get formatted display values
  getDisplayValues() {
    return {
      money: formatNumber(this.money),
      totalEarned: formatNumber(this.totalEarned),
      incomeRate: formatNumber(this.incomeRate),
      castlesDestroyed: this.castlesDestroyed.toString(),
    };
  }

  // Get upgrade information for UI
  getUpgradeInfo(upgradeType) {
    const level = this.upgrades[upgradeType];
    const cost = this.getUpgradeCost(upgradeType);
    const canAfford = this.canAfford(upgradeType);

    // Calculate effect for display
    const effectPercent = Math.floor(
      level * CONFIG.UPGRADES.EFFECTS[upgradeType] * 100
    );

    return {
      type: upgradeType,
      level: level,
      cost: cost,
      costFormatted: formatNumber(cost),
      canAfford: canAfford,
      effectPercent: effectPercent,
      name: this.getUpgradeName(upgradeType),
      description: this.getUpgradeDescription(upgradeType, effectPercent),
    };
  }

  getUpgradeName(upgradeType) {
    const names = {
      fireRate: "Fire Rate",
      size: "Cannonball Size",
      speed: "Firing Speed",
      accuracy: "Accuracy",
    };
    return names[upgradeType] || upgradeType;
  }

  getUpgradeDescription(upgradeType, effectPercent) {
    const descriptions = {
      fireRate: `+${effectPercent}% faster firing`,
      size: `+${effectPercent}% larger cannonballs`,
      speed: `+${effectPercent}% faster cannonballs`,
      accuracy: `+${effectPercent}% more accurate`,
    };
    return descriptions[upgradeType] || "";
  }
}
