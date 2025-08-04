// UI Management for HUD and interface
import { formatNumber } from "./utils.js";

class UIManager {
  constructor(
    upgradeManager,
    worldManager = null,
    onUpgradePurchased = null,
    cannon = null
  ) {
    this.upgradeManager = upgradeManager;
    this.worldManager = worldManager;
    this.onUpgradePurchased = onUpgradePurchased;
    this.cannon = cannon;
    this.isHidden = false;
    this.elements = {};

    this.initializeElements();
    this.setupEventListeners();
    this.createUpgradeCards();
  }

  // Method to set cannon reference after it's created
  setCannon(cannon) {
    this.cannon = cannon;
  }

  initializeElements() {
    // Cache DOM elements
    this.elements = {
      hud: document.getElementById("hud"),
      hudToggle: document.getElementById("hudToggle"),
      showHudButton: document.getElementById("showHudButton"),
      moneyAmount: document.getElementById("moneyAmount"),
      totalEarned: document.getElementById("totalEarned"),
      streakMultiplier: document.getElementById("streakMultiplier"),
      castlesDestroyed: document.getElementById("castlesDestroyed"),
      upgradesContainer: document.getElementById("upgradesContainer"),
      resetProgress: document.getElementById("resetProgress"),
      worldName: document.getElementById("worldName"),
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
            }</span>${
      upgradeInfo.levelCap ? ` / ${upgradeInfo.levelCap}` : ""
    }</div>
            <div class="upgrade-cost">Cost: $<span class="cost-value">${
              upgradeInfo.costFormatted
            }</span></div>
            <div class="upgrade-effect">${upgradeInfo.description}</div>
            <button class="upgrade-button" ${
              !upgradeInfo.canAfford || upgradeInfo.isMaxed ? "disabled" : ""
            }>
                ${upgradeInfo.isMaxed ? "MAXED" : "UPGRADE"}
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
    const levelDiv = card.querySelector(".upgrade-level");
    levelDiv.innerHTML = `Level: <span class="level-value">${
      upgradeInfo.level
    }</span>${upgradeInfo.levelCap ? ` / ${upgradeInfo.levelCap}` : ""}`;

    card.querySelector(".cost-value").textContent = upgradeInfo.costFormatted;
    card.querySelector(".upgrade-effect").textContent = upgradeInfo.description;

    // Update button state
    const button = card.querySelector(".upgrade-button");
    button.disabled = !upgradeInfo.canAfford || upgradeInfo.isMaxed;
    button.textContent = upgradeInfo.isMaxed ? "MAXED" : "UPGRADE";
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
    this.elements.castlesDestroyed.textContent = displayValues.castlesDestroyed;

    // Update money streak multiplier display
    const streak = this.upgradeManager.getStreakProgress();
    this.elements.streakMultiplier.textContent = `${streak.multiplier}`;

    // Update world name display
    if (this.worldManager && this.elements.worldName) {
      this.elements.worldName.textContent =
        this.worldManager.getWorldProgressText();
    }

    // Update world progression display if element exists
    if (this.worldManager && this.elements.worldProgress) {
      this.elements.worldProgress.textContent =
        this.worldManager.getWorldProgressText();
    }

    if (this.worldManager && this.elements.worldCompletion) {
      this.elements.worldCompletion.textContent =
        this.worldManager.getCompletionProgressText(this.upgradeManager);
    }

    // Update upgrade affordability
    this.updateAllUpgradeCards();

    // Update HUD visibility (in case affordability changed)
    this.updateHUDVisibility();
  }

  toggleHUD() {
    this.isHidden = !this.isHidden;
    this.updateHUDVisibility();
  }

  showHUD() {
    this.isHidden = false;
    this.updateHUDVisibility();
  }

  // Check if any upgrade is affordable
  canAffordAnyUpgrade() {
    const upgradeTypes = ["fireRate", "size"];
    return upgradeTypes.some((type) => {
      const upgradeInfo = this.upgradeManager.getUpgradeInfo(type);
      return upgradeInfo.canAfford && !upgradeInfo.isMaxed;
    });
  }

  updateHUDVisibility() {
    if (this.isHidden) {
      this.elements.hud.classList.add("hidden");

      // Check if any upgrade is affordable to add asterisk
      const canAffordAny = this.canAffordAnyUpgrade();
      this.elements.hudToggle.textContent = canAffordAny
        ? "Show HUD*"
        : "Show HUD";
      this.elements.showHudButton.textContent = canAffordAny
        ? "Show HUD*"
        : "Show HUD";

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
      if (this.cannon) {
        this.cannon.upgrades = {
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

  // Show custom modal overlay
  showModal(title, subtitle = "", buttonText = "Continue", onConfirm = null) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "game-modal-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      font-family: Arial, sans-serif;
    `;

    // Create modal content
    const modal = document.createElement("div");
    modal.className = "game-modal";
    modal.style.cssText = `
      background: linear-gradient(135deg, #2c3e50, #34495e);
      border: 3px solid #f39c12;
      border-radius: 15px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      width: 90%;
      animation: modalSlideIn 0.3s ease-out;
    `;

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes modalSlideIn {
        from {
          transform: scale(0.8) translateY(-50px);
          opacity: 0;
        }
        to {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Create title
    const titleElement = document.createElement("h1");
    titleElement.textContent = title;
    titleElement.style.cssText = `
      color: #f39c12;
      font-size: 2.5em;
      margin: 0 0 20px 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    `;

    // Create subtitle if provided
    let subtitleElement = null;
    if (subtitle) {
      subtitleElement = document.createElement("p");
      subtitleElement.textContent = subtitle;
      subtitleElement.style.cssText = `
        color: #ecf0f1;
        font-size: 1.2em;
        margin: 0 0 30px 0;
        line-height: 1.4;
      `;
    }

    // Create button
    const button = document.createElement("button");
    button.textContent = buttonText;
    button.style.cssText = `
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 1.2em;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;

    // Button hover effects
    button.addEventListener("mouseenter", () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 20px rgba(231, 76, 60, 0.6)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 15px rgba(231, 76, 60, 0.4)";
    });

    // Button click handler
    button.addEventListener("click", () => {
      document.body.removeChild(overlay);
      document.head.removeChild(style);
      if (onConfirm) {
        onConfirm();
      }
    });

    // Assemble modal
    modal.appendChild(titleElement);
    if (subtitleElement) {
      modal.appendChild(subtitleElement);
    }
    modal.appendChild(button);
    overlay.appendChild(modal);

    // Add to page
    document.body.appendChild(overlay);

    // Focus the button for keyboard accessibility
    button.focus();

    // Allow ESC key to close modal
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        document.head.removeChild(style);
        document.removeEventListener("keydown", handleEscape);
        if (onConfirm) {
          onConfirm();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
}

export default UIManager;
