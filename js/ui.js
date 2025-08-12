// UI Management for HUD and interface
import { formatNumber } from "./utils.js";

class UIManager {
  constructor(
    upgradeManager,
    worldManager = null,
    onUpgradePurchased = null,
    cannon = null,
    prestigeManager = null
  ) {
    this.upgradeManager = upgradeManager;
    this.worldManager = worldManager;
    this.onUpgradePurchased = onUpgradePurchased;
    this.cannon = cannon;
    this.prestigeManager = prestigeManager;
    this.game = null; // Will be set by game
    this.isHidden = false;
    this.currentTab = "upgrades"; // 'upgrades', 'prestige', 'cannons'
    this.elements = {};

    this.initializeElements();
    this.setupEventListeners();
    this.createTabs();
    this.createUpgradeCards();

    // Set initial visibility state for world display
    this.updateHUDVisibility();
  }

  setGame(game) {
    this.game = game;
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
      worldNameTop: document.getElementById("worldNameTop"),
      worldDisplay: document.getElementById("worldDisplay"),
      gemsAmount: document.getElementById("gemsAmount"),
      gemsDisplay: document.getElementById("gemsDisplay"),
      prestigeLevel: document.getElementById("prestigeLevel"),
      prestigeLevelDisplay: document.getElementById("prestigeLevelDisplay"),
      fullscreenButton: document.getElementById("fullscreenButton"),
      fullscreenEnterIcon: document.getElementById("fullscreenEnterIcon"),
      fullscreenExitIcon: document.getElementById("fullscreenExitIcon"),
    };

    // Add mobile-specific initialization
    this.initializeMobileFeatures();
  }

  initializeMobileFeatures() {
    // Detect if the device is mobile
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;

    // Set up dynamic viewport height handling for mobile browsers
    this.setupDynamicViewportHeight();

    // Add viewport meta tag optimization for mobile if not present
    if (this.isMobile && !document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement("meta");
      viewport.name = "viewport";
      viewport.content =
        "width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no";
      document.head.appendChild(viewport);
    }

    // Add mobile-specific event listeners
    if (this.isMobile) {
      this.setupMobileEventListeners();
    }

    // Handle orientation changes
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });

    // Handle window resize for responsive behavior
    window.addEventListener("resize", () => {
      this.handleResize();
    });

    // Improve fullscreen button visibility on mobile
    this.enhanceFullscreenButton();

    // Debug fullscreen button visibility on mobile
    if (this.isMobile) {
      this.debugFullscreenButton();
    }
  }

  debugFullscreenButton() {
    const fullscreenButton = this.elements.fullscreenButton;
    if (fullscreenButton) {
      console.log("Fullscreen button found:", fullscreenButton);
      console.log(
        "Button computed style:",
        window.getComputedStyle(fullscreenButton)
      );
      console.log("Button position:", {
        bottom: fullscreenButton.style.bottom,
        right: fullscreenButton.style.right,
        zIndex: fullscreenButton.style.zIndex,
        display: fullscreenButton.style.display,
      });

      // Make sure it's visible
      setTimeout(() => {
        const rect = fullscreenButton.getBoundingClientRect();
        console.log("Button position rect:", rect);
        console.log("Viewport dimensions:", {
          width: window.innerWidth,
          height: window.innerHeight,
          visualViewport: window.visualViewport
            ? {
                width: window.visualViewport.width,
                height: window.visualViewport.height,
              }
            : "not supported",
        });
      }, 1000);
    } else {
      console.error("Fullscreen button not found!");
    }
  }

  setupDynamicViewportHeight() {
    // Function to set CSS custom property for viewport height
    const setViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      // For mobile browsers, use the visual viewport API if available
      if (window.visualViewport) {
        const vvh = window.visualViewport.height * 0.01;
        document.documentElement.style.setProperty("--vvh", `${vvh}px`);
      }
    };

    // Set initial value
    setViewportHeight();

    // Update on resize
    window.addEventListener("resize", setViewportHeight);

    // Update on visual viewport change (mobile address bar show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setViewportHeight);
    }

    // Special handling for mobile orientation change
    window.addEventListener("orientationchange", () => {
      setTimeout(setViewportHeight, 100);
    });
  }

  enhanceFullscreenButton() {
    const fullscreenButton = this.elements.fullscreenButton;
    if (!fullscreenButton) return;

    // Make fullscreen button more prominent on mobile
    if (this.isMobile) {
      // Ensure the button is always visible and properly positioned
      const updateButtonPosition = () => {
        fullscreenButton.style.cssText += `
          position: fixed !important;
          z-index: 2000 !important;
          bottom: max(20px, env(safe-area-inset-bottom, 20px)) !important;
          right: max(20px, env(safe-area-inset-right, 20px)) !important;
          background: rgba(0, 0, 0, 0.95) !important;
          border: 2px solid rgba(255, 255, 255, 0.4) !important;
          width: 44px !important;
          height: 44px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6) !important;
          touch-action: manipulation !important;
          display: flex !important;
        `;
      };

      updateButtonPosition();

      // Add extra touch feedback
      fullscreenButton.addEventListener("touchstart", () => {
        fullscreenButton.style.transform = "scale(0.9)";
        fullscreenButton.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
      });

      fullscreenButton.addEventListener("touchend", () => {
        setTimeout(() => {
          fullscreenButton.style.transform = "";
          fullscreenButton.style.backgroundColor = "";
        }, 150);
      });

      // Re-apply position on orientation change
      window.addEventListener("orientationchange", () => {
        setTimeout(updateButtonPosition, 200);
      });
    }
  }

  setupMobileEventListeners() {
    // Prevent accidental zoom on double-tap for game elements
    const gameElements = [
      this.elements.hud,
      this.elements.hudToggle,
      this.elements.showHudButton,
      document.getElementById("gameCanvas"),
    ];

    gameElements.forEach((element) => {
      if (element) {
        element.addEventListener(
          "touchstart",
          (e) => {
            // Prevent default touch behavior that might interfere with game
            if (e.touches.length > 1) {
              e.preventDefault();
            }
          },
          { passive: false }
        );
      }
    });

    // Add swipe gesture to close HUD on mobile
    let startY = 0;
    let startX = 0;

    this.elements.hud.addEventListener("touchstart", (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    });

    this.elements.hud.addEventListener("touchmove", (e) => {
      if (!this.isHidden) {
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = startY - currentY;
        const diffX = Math.abs(startX - currentX);

        // If swiping up and not too much horizontal movement
        if (diffY > 50 && diffX < 100) {
          this.toggleHUD();
        }
      }
    });
  }

  handleOrientationChange() {
    // Update mobile state
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;

    // Refresh UI layout
    this.updateHUDVisibility();

    // Update tab content to ensure proper layout
    if (this.currentTab) {
      setTimeout(() => {
        this.updateTabContent();
      }, 200);
    }
  }

  handleResize() {
    // Update mobile detection
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768 || "ontouchstart" in window;

    // If mobile state changed, reinitialize mobile features
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.setupMobileEventListeners();
      }
    }

    // Update UI layout
    this.updateHUDVisibility();
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

    // Fullscreen toggle button
    if (this.elements.fullscreenButton) {
      this.elements.fullscreenButton.addEventListener("click", () => {
        this.toggleFullscreen();
      });
    }

    // Listen for fullscreen changes to update icon
    document.addEventListener("fullscreenchange", () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener("webkitfullscreenchange", () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener("mozfullscreenchange", () => {
      this.updateFullscreenIcon();
    });
    document.addEventListener("MSFullscreenChange", () => {
      this.updateFullscreenIcon();
    });
  }

  createTabs() {
    // Create tab navigation if it doesn't exist
    let tabContainer = document.getElementById("tabContainer");
    if (!tabContainer) {
      tabContainer = document.createElement("div");
      tabContainer.id = "tabContainer";
      tabContainer.className = "tab-container";

      const tabs = [
        { id: "upgrades", label: "Upgrades", visible: true },
        {
          id: "prestige",
          label: this.isMobile ? "Prestige" : "Prestige Upgrades",
          visible: () =>
            this.prestigeManager && this.prestigeManager.prestigeLevel > 0,
        },
        {
          id: "cannons",
          label: this.isMobile ? "Skins" : "Cannons",
          visible: () =>
            this.prestigeManager && this.prestigeManager.prestigeLevel > 0,
        },
      ];

      tabs.forEach((tab) => {
        const tabButton = document.createElement("button");
        tabButton.id = `${tab.id}Tab`;
        tabButton.className = `tab-button ${
          this.currentTab === tab.id ? "active" : ""
        }`;
        tabButton.textContent = tab.label;

        // Add mobile-specific attributes
        if (this.isMobile) {
          tabButton.style.touchAction = "manipulation";
          tabButton.setAttribute("aria-label", `Switch to ${tab.label} tab`);
        }

        tabButton.addEventListener("click", () => this.switchTab(tab.id));

        // Add touch feedback for mobile
        if (this.isMobile) {
          tabButton.addEventListener("touchstart", () => {
            tabButton.style.backgroundColor = "#888";
          });

          tabButton.addEventListener("touchend", () => {
            setTimeout(() => {
              if (!tabButton.classList.contains("active")) {
                tabButton.style.backgroundColor = "";
              }
            }, 150);
          });
        }

        // Set initial visibility
        const isVisible =
          typeof tab.visible === "function" ? tab.visible() : tab.visible;
        tabButton.style.display = isVisible ? "inline-block" : "none";

        tabContainer.appendChild(tabButton);
      });

      // Insert before upgrades container
      const upgradesContainer = document.getElementById("upgradesContainer");
      upgradesContainer.parentNode.insertBefore(
        tabContainer,
        upgradesContainer
      );
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update tab button states
    document.querySelectorAll(".tab-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.getElementById(`${tabId}Tab`).classList.add("active");

    // Update content
    this.updateTabContent();
  }

  updateTabContent() {
    const container = this.elements.upgradesContainer;
    container.innerHTML = "";

    switch (this.currentTab) {
      case "upgrades":
        this.createUpgradeCards();
        break;
      case "prestige":
        this.createPrestigeUpgradeCards();
        break;
      case "cannons":
        this.createCannonCards();
        break;
    }
  }

  createPrestigeUpgradeCards() {
    if (!this.prestigeManager) return;

    const container = this.elements.upgradesContainer;
    const prestigeUpgrades = this.prestigeManager.getAllPrestigeUpgradeInfo();

    for (const [upgradeType, upgradeInfo] of Object.entries(prestigeUpgrades)) {
      const card = this.createPrestigeUpgradeCard(upgradeInfo);
      container.appendChild(card);
    }
  }

  createPrestigeUpgradeCard(upgradeInfo) {
    const card = document.createElement("div");
    card.className = "upgrade-card prestige-upgrade-card";
    card.dataset.upgradeType = upgradeInfo.type;

    // Add mobile-specific attributes
    if (this.isMobile) {
      card.style.touchAction = "manipulation";
    }

    card.innerHTML = `
      <div class="upgrade-name">${upgradeInfo.name}</div>
      <div class="upgrade-level">Level: <span class="level-value">${
        upgradeInfo.level
      }</span>${upgradeInfo.levelCap ? ` / ${upgradeInfo.levelCap}` : ""}</div>
      <div class="upgrade-cost">Cost: <span class="cost-value">${
        upgradeInfo.costFormatted
      }</span> 💎</div>
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
      this.handlePrestigeUpgrade(upgradeInfo.type);
    });

    // Add mobile-specific touch feedback
    if (this.isMobile) {
      this.addMobileTouchFeedback(button);
    }

    return card;
  }

  createCannonCards() {
    if (!this.prestigeManager) return;

    const container = this.elements.upgradesContainer;
    const unlockedCannons = this.prestigeManager.getUnlockedCannons();
    const selectedCannon = this.prestigeManager.getSelectedCannon();

    unlockedCannons.forEach((cannon) => {
      const card = this.createCannonCard(
        cannon,
        cannon.id === selectedCannon.id
      );
      container.appendChild(card);
    });
  }

  createCannonCard(cannon, isSelected) {
    const card = document.createElement("div");
    card.className = `cannon-card ${isSelected ? "selected" : ""}`;
    card.dataset.cannonId = cannon.id;

    // Add mobile-specific attributes
    if (this.isMobile) {
      card.style.touchAction = "manipulation";
    }

    card.innerHTML = `
      <div class="cannon-name">${cannon.name}</div>
      <div class="cannon-description">${cannon.description}</div>
      <div class="cannon-status">${isSelected ? "SELECTED" : "AVAILABLE"}</div>
      <button class="cannon-button" ${isSelected ? "disabled" : ""}>
        ${isSelected ? "SELECTED" : "SELECT"}
      </button>
    `;

    // Add click handler for select button
    const button = card.querySelector(".cannon-button");
    button.addEventListener("click", () => {
      this.handleCannonSelect(cannon.id);
    });

    // Add mobile-specific touch feedback
    if (this.isMobile) {
      this.addMobileTouchFeedback(button);

      // Add touch feedback for the entire card
      card.addEventListener("touchstart", () => {
        if (!isSelected) {
          card.style.transform = "scale(0.98)";
          card.style.boxShadow = "inset 0 2px 8px rgba(0,0,0,0.2)";
        }
      });

      card.addEventListener("touchend", () => {
        setTimeout(() => {
          card.style.transform = "";
          card.style.boxShadow = "";
        }, 150);
      });

      card.addEventListener("touchcancel", () => {
        card.style.transform = "";
        card.style.boxShadow = "";
      });
    }

    return card;
  }

  handlePrestigeUpgrade(upgradeType) {
    if (
      this.prestigeManager &&
      this.prestigeManager.purchasePrestigeUpgrade(upgradeType)
    ) {
      this.updateTabContent();
      this.updateStats();
      this.showUpgradeEffect(upgradeType, true);
    }
  }

  handleCannonSelect(cannonId) {
    if (this.prestigeManager && this.prestigeManager.selectCannon(cannonId)) {
      this.updateTabContent();
      // Notify game of cannon change if needed
      console.log(
        `Selected cannon: ${this.prestigeManager.getSelectedCannon().name}`
      );
    }
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

    // Add mobile-specific attributes
    if (this.isMobile) {
      card.style.touchAction = "manipulation";
    }

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

    // Add mobile-specific touch feedback
    if (this.isMobile) {
      this.addMobileTouchFeedback(button);
    }

    return card;
  }

  addMobileTouchFeedback(button) {
    button.style.touchAction = "manipulation";

    button.addEventListener("touchstart", () => {
      if (!button.disabled) {
        button.style.transform = "scale(0.95)";
        button.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.3)";
      }
    });

    button.addEventListener("touchend", () => {
      setTimeout(() => {
        button.style.transform = "";
        button.style.boxShadow = "";
      }, 150);
    });

    button.addEventListener("touchcancel", () => {
      button.style.transform = "";
      button.style.boxShadow = "";
    });
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

  showUpgradeEffect(upgradeType, isPrestige = false) {
    const selector = isPrestige
      ? `[data-upgrade-type="${upgradeType}"]`
      : `[data-upgrade-type="${upgradeType}"]`;
    const card = document.querySelector(selector);
    if (!card) return;

    // Add visual effect
    card.style.transform = "scale(1.05)";
    const color = isPrestige
      ? "rgba(128, 0, 128, 0.5)"
      : "rgba(76, 175, 80, 0.5)";
    card.style.boxShadow = `0 0 20px ${color}`;

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

    // Update prestige stats if available
    if (this.prestigeManager) {
      const prestigeValues = this.prestigeManager.getDisplayValues();
      if (this.elements.gemsAmount) {
        this.elements.gemsAmount.textContent = prestigeValues.gems;
      }
      if (this.elements.prestigeLevel) {
        this.elements.prestigeLevel.textContent = prestigeValues.prestigeLevel;
      }

      // Show/hide prestige UI elements
      const showPrestige = this.prestigeManager.prestigeLevel > 0;
      if (this.elements.gemsDisplay) {
        this.elements.gemsDisplay.style.display = showPrestige
          ? "block"
          : "none";
      }
      if (this.elements.prestigeLevelDisplay) {
        this.elements.prestigeLevelDisplay.style.display = showPrestige
          ? "block"
          : "none";
      }
    }

    // Update world name display (include prestige level if available)
    if (this.worldManager && this.elements.worldName) {
      let worldText = this.worldManager.getWorldProgressText();
      this.elements.worldName.textContent = worldText;
    }

    // Update top world display
    if (this.worldManager && this.elements.worldNameTop) {
      let worldText = this.worldManager.getWorldProgressText();
      this.elements.worldNameTop.textContent = worldText;
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

    // Update tab visibility
    this.updateTabVisibility();

    // Update current tab content
    if (this.currentTab === "prestige") {
      this.updateTabContent();
    } else if (this.currentTab === "cannons") {
      this.updateTabContent();
    } else {
      // Update regular upgrade affordability
      this.updateAllUpgradeCards();
    }

    // Update HUD visibility (in case affordability changed)
    this.updateHUDVisibility();
  }

  updateTabVisibility() {
    // Show/hide prestige and cannon tabs based on prestige level
    const prestigeTab = document.getElementById("prestigeTab");
    const cannonsTab = document.getElementById("cannonsTab");

    const showPrestigeTabs =
      this.prestigeManager && this.prestigeManager.prestigeLevel > 0;

    if (prestigeTab) {
      prestigeTab.style.display = showPrestigeTabs ? "inline-block" : "none";
    }
    if (cannonsTab) {
      cannonsTab.style.display = showPrestigeTabs ? "inline-block" : "none";
    }
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

      // Show the world display when HUD is hidden
      if (this.elements.worldDisplay) {
        this.elements.worldDisplay.style.display = "block";
      }

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

      // Hide the world display when HUD is shown
      if (this.elements.worldDisplay) {
        this.elements.worldDisplay.style.display = "none";
      }

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

    // Mobile-responsive positioning
    const isMobile = window.innerWidth <= 768;

    notification.style.cssText = `
            position: fixed;
            top: ${isMobile ? "10px" : "20px"};
            right: ${isMobile ? "10px" : "20px"};
            left: ${isMobile ? "10px" : "auto"};
            background: ${
              type === "success"
                ? "#4CAF50"
                : type === "error"
                ? "#f44336"
                : "#2196F3"
            };
            color: white;
            padding: ${isMobile ? "10px 15px" : "12px 20px"};
            border-radius: 5px;
            font-weight: bold;
            font-size: ${isMobile ? "14px" : "16px"};
            z-index: 1001;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: ${isMobile ? "calc(100% - 20px)" : "400px"};
            text-align: ${isMobile ? "center" : "left"};
            word-wrap: break-word;
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    }, 10);

    // Animate out and remove
    setTimeout(
      () => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(-20px)";

        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      },
      isMobile ? 2500 : 3000
    ); // Shorter display time on mobile
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
      "Are you sure you want to reset ALL progress?\n\n" +
        "This will permanently delete:\n" +
        "• All money and upgrades\n" +
        "• World progression\n" +
        "• Prestige level and gems\n" +
        "• Statistics and saved data\n\n" +
        "This action cannot be undone!"
    );

    if (confirmed) {
      // Reset everything through the game
      if (this.game) {
        this.game.resetAllProgress();
      } else {
        // Fallback if game reference not available
        this.upgradeManager.resetProgress();
        if (this.worldManager) this.worldManager.resetProgress();
        if (this.prestigeManager) this.prestigeManager.resetProgress();
      }

      // Update the UI immediately
      this.updateStats();
      this.updateTabContent();

      // Show confirmation message
      this.showNotification("All progress has been reset!", "success");
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
      padding: 20px;
      box-sizing: border-box;
    `;

    // Create modal content
    const modal = document.createElement("div");
    modal.className = "game-modal";

    // Check if it's a mobile device
    const isMobile = window.innerWidth <= 768;

    modal.style.cssText = `
      background: linear-gradient(135deg, #2c3e50, #34495e);
      border: 3px solid #f39c12;
      border-radius: 15px;
      padding: ${isMobile ? "20px" : "40px"};
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      max-width: ${isMobile ? "90%" : "500px"};
      width: ${isMobile ? "100%" : "90%"};
      max-height: 90vh;
      overflow-y: auto;
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
      
      @media (max-width: 768px) {
        .game-modal {
          border-radius: 10px !important;
          border-width: 2px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Create title
    const titleElement = document.createElement("h1");
    titleElement.textContent = title;
    titleElement.style.cssText = `
      color: #f39c12;
      font-size: ${isMobile ? "1.8em" : "2.5em"};
      margin: 0 0 ${isMobile ? "15px" : "20px"} 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    `;

    // Create subtitle if provided
    let subtitleElement = null;
    if (subtitle) {
      subtitleElement = document.createElement("p");
      subtitleElement.textContent = subtitle;
      subtitleElement.style.cssText = `
        color: #ecf0f1;
        font-size: ${isMobile ? "1em" : "1.2em"};
        margin: 0 0 ${isMobile ? "20px" : "30px"} 0;
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
      padding: ${isMobile ? "12px 25px" : "15px 30px"};
      font-size: ${isMobile ? "1em" : "1.2em"};
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
      min-height: ${isMobile ? "44px" : "auto"};
      touch-action: manipulation;
    `;

    // Button hover/touch effects
    const addActiveEffect = () => {
      button.style.transform = "translateY(-2px)";
      button.style.boxShadow = "0 6px 20px rgba(231, 76, 60, 0.6)";
    };

    const removeActiveEffect = () => {
      button.style.transform = "translateY(0)";
      button.style.boxShadow = "0 4px 15px rgba(231, 76, 60, 0.4)";
    };

    button.addEventListener("mouseenter", addActiveEffect);
    button.addEventListener("mouseleave", removeActiveEffect);
    button.addEventListener("touchstart", addActiveEffect);
    button.addEventListener("touchend", removeActiveEffect);

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

  // Handle prestige event
  onPrestige() {
    // Switch to upgrades tab
    this.switchTab("upgrades");

    // Update all UI elements
    this.updateStats();
    this.updateTabVisibility();

    // Show celebration notification
    this.showNotification(
      "Prestige achieved! Welcome to the multiverse!",
      "success"
    );
  }

  // Fullscreen functionality
  toggleFullscreen() {
    if (this.isFullscreen()) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  enterFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }

  updateFullscreenIcon() {
    if (
      !this.elements.fullscreenEnterIcon ||
      !this.elements.fullscreenExitIcon
    ) {
      return;
    }

    const isFullscreen = this.isFullscreen();
    this.elements.fullscreenEnterIcon.style.display = isFullscreen
      ? "none"
      : "block";
    this.elements.fullscreenExitIcon.style.display = isFullscreen
      ? "block"
      : "none";
  }
}

export default UIManager;
