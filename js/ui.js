// UI Management for HUD and interface

class UIManager {
  constructor(upgradeManager, onUpgradePurchased = null) {
    this.upgradeManager = upgradeManager;
    this.onUpgradePurchased = onUpgradePurchased;
    this.isHidden = false;
    this.elements = {};

    this.initializeElements();
    this.setupEventListeners();
    this.createUpgradeCards();
  }

  initializeElements() {
    // Cache DOM elements
    this.elements = {
      hud: document.getElementById("hud"),
      hudToggle: document.getElementById("hudToggle"),
      showHudButton: document.getElementById("showHudButton"),
      moneyAmount: document.getElementById("moneyAmount"),
      totalEarned: document.getElementById("totalEarned"),
      incomeRate: document.getElementById("incomeRate"),
      castlesDestroyed: document.getElementById("castlesDestroyed"),
      upgradesContainer: document.getElementById("upgradesContainer"),
      resetProgress: document.getElementById("resetProgress"),
    };
  }

  setupEventListeners() {
    // HUD toggle button
    this.elements.hudToggle.addEventListener("click", () => {
      this.toggleHUD();
    });

    // Show HUD button
    this.elements.showHudButton.addEventListener("click", () => {
      this.showHUD();
    });

    // Reset progress button
    this.elements.resetProgress.addEventListener("click", () => {
      this.handleResetProgress();
    });

    // Auto-save when window closes
    window.addEventListener("beforeunload", () => {
      this.upgradeManager.saveProgress();
    });

    // Save periodically
    setInterval(() => {
      this.upgradeManager.saveProgress();
    }, 30000); // Save every 30 seconds
  }
  createUpgradeCards() {
    const upgradeTypes = ["fireRate", "size"];

    upgradeTypes.forEach((type) => {
      const card = this.createUpgradeCard(type);
      this.elements.upgradesContainer.appendChild(card);
    });
  }

  createUpgradeCard(upgradeType) {
    const upgradeInfo = this.upgradeManager.getUpgradeInfo(upgradeType);

    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.dataset.upgradeType = upgradeType;

    card.innerHTML = `
            <div class="upgrade-name">${upgradeInfo.name}</div>
            <div class="upgrade-level">Level: <span class="level-value">${
              upgradeInfo.level
            }</span></div>
            <div class="upgrade-cost">Cost: $<span class="cost-value">${
              upgradeInfo.costFormatted
            }</span></div>
            <div class="upgrade-effect">${upgradeInfo.description}</div>
            <button class="upgrade-button" ${
              !upgradeInfo.canAfford ? "disabled" : ""
            }>
                UPGRADE
            </button>
        `;

    // Add click handler for upgrade button
    const button = card.querySelector(".upgrade-button");
    button.addEventListener("click", () => {
      this.handleUpgrade(upgradeType);
    });

    return card;
  }

  handleUpgrade(upgradeType) {
    if (this.upgradeManager.purchaseUpgrade(upgradeType)) {
      // Update the UI
      this.updateUpgradeCard(upgradeType);
      this.updateStats();

      // Notify the game that an upgrade was purchased
      if (this.onUpgradePurchased) {
        this.onUpgradePurchased(upgradeType);
      }

      // Visual feedback
      this.showUpgradeEffect(upgradeType);
    }
  }

  updateUpgradeCard(upgradeType) {
    const card = document.querySelector(`[data-upgrade-type="${upgradeType}"]`);
    if (!card) return;

    const upgradeInfo = this.upgradeManager.getUpgradeInfo(upgradeType);

    // Update values
    card.querySelector(".level-value").textContent = upgradeInfo.level;
    card.querySelector(".cost-value").textContent = upgradeInfo.costFormatted;
    card.querySelector(".upgrade-effect").textContent = upgradeInfo.description;

    // Update button state
    const button = card.querySelector(".upgrade-button");
    button.disabled = !upgradeInfo.canAfford;
  }

  updateAllUpgradeCards() {
    const upgradeTypes = ["fireRate", "size"];
    upgradeTypes.forEach((type) => {
      this.updateUpgradeCard(type);
    });
  }

  showUpgradeEffect(upgradeType) {
    const card = document.querySelector(`[data-upgrade-type="${upgradeType}"]`);
    if (!card) return;

    // Add visual effect
    card.style.transform = "scale(1.05)";
    card.style.boxShadow = "0 0 20px rgba(76, 175, 80, 0.5)";

    setTimeout(() => {
      card.style.transform = "";
      card.style.boxShadow = "";
    }, 300);
  }

  updateStats() {
    const displayValues = this.upgradeManager.getDisplayValues();

    // Update money and stats
    this.elements.moneyAmount.textContent = displayValues.money;
    this.elements.totalEarned.textContent = displayValues.totalEarned;
    this.elements.incomeRate.textContent = displayValues.incomeRate;
    this.elements.castlesDestroyed.textContent = displayValues.castlesDestroyed;

    // Update upgrade affordability
    this.updateAllUpgradeCards();
  }

  toggleHUD() {
    this.isHidden = !this.isHidden;
    this.updateHUDVisibility();
  }

  showHUD() {
    this.isHidden = false;
    this.updateHUDVisibility();
  }

  updateHUDVisibility() {
    if (this.isHidden) {
      this.elements.hud.classList.add("hidden");
      this.elements.hudToggle.textContent = "Show HUD";
      this.elements.showHudButton.classList.add("visible");
    } else {
      this.elements.hud.classList.remove("hidden");
      this.elements.hudToggle.textContent = "Hide HUD";
      this.elements.showHudButton.classList.remove("visible");
    }
  }

  showMoneyEarned(amount, x, y) {
    // Create floating money text
    const moneyText = document.createElement("div");
    moneyText.className = "floating-money";
    moneyText.textContent = `+$${formatNumber(amount)}`;
    moneyText.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            color: #FFD700;
            font-weight: bold;
            font-size: 18px;
            pointer-events: none;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            animation: floatUp 2s ease-out forwards;
        `;

    // Add animation keyframes if not already added
    if (!document.querySelector("#floating-money-style")) {
      const style = document.createElement("style");
      style.id = "floating-money-style";
      style.textContent = `
                @keyframes floatUp {
                    0% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-50px);
                    }
                }
            `;
      document.head.appendChild(style);
    }

    document.body.appendChild(moneyText);

    // Remove after animation
    setTimeout(() => {
      if (moneyText.parentNode) {
        moneyText.parentNode.removeChild(moneyText);
      }
    }, 2000);
  }

  // Show notification messages
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${
              type === "success"
                ? "#4CAF50"
                : type === "error"
                ? "#f44336"
                : "#2196F3"
            };
            color: white;
            padding: 12px 20px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 1001;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    }, 10);

    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Get canvas coordinates for money earned display
  getCanvasPosition(canvasX, canvasY) {
    const canvas = document.getElementById("gameCanvas");
    const rect = canvas.getBoundingClientRect();

    return {
      x: rect.left + canvasX,
      y: rect.top + canvasY,
    };
  }

  // Initialize UI update loop
  startUpdateLoop() {
    setInterval(() => {
      this.updateStats();
    }, 1000); // Update every second
  }

  // Handle reset progress with confirmation
  handleResetProgress() {
    const confirmed = confirm(
      "Are you sure you want to reset all progress?\n\n" +
        "This will permanently delete:\n" +
        "• All money and upgrades\n" +
        "• Statistics and achievements\n" +
        "• Saved game data\n\n" +
        "This action cannot be undone!"
    );

    if (confirmed) {
      // Reset the upgrade manager
      this.upgradeManager.resetProgress();

      // Update the UI immediately
      this.updateStats();
      this.updateAllUpgradeCards();

      // Show confirmation message
      this.showNotification("Progress has been reset!", "success");

      // Notify the game to reset cannon upgrades
      if (window.game && window.game.cannon) {
        window.game.cannon.upgrades = {
          fireRate: 0,
          size: 0,
          speed: 0,
          accuracy: 0,
        };
      }
    }
  }

  // Show notification messages
  showNotification(message, type = "info") {
    // Simple notification - could be enhanced with a proper notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
