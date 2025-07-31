# Idle Cannon - Implementation Plan

## Project Structure

```
idle-cannon/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Game styling
├── js/
│   ├── main.js            # Game initialization and main loop
│   ├── cannon.js          # Cannon class and firing logic
│   ├── castle.js          # Castle generation and management
│   ├── physics.js         # Matter.js wrapper and physics helpers
│   ├── upgrades.js        # Upgrade system and economy
│   ├── ui.js              # HUD and interface management
│   ├── particles.js       # Particle effects system
│   ├── utils.js           # Utility functions
│   └── config.js          # Game configuration constants
├── assets/
│   ├── images/            # Sprites and textures (if any)
│   └── sounds/            # Audio files (future)
└── libs/
    └── matter.min.js      # Matter.js physics engine
```

## Core Classes and Architecture

### 1. Game Class (main.js)

```javascript
class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.engine = null;
    this.world = null;
    this.cannon = null;
    this.castle = null;
    this.ui = null;
    this.gameState = "playing";
    this.lastTime = 0;
  }

  init() {
    // Initialize canvas, physics, and game objects
  }

  gameLoop(currentTime) {
    // Main game loop with delta time
  }

  update(deltaTime) {
    // Update game logic
  }

  render() {
    // Render all game objects
  }
}
```

### 2. Cannon Class (cannon.js)

```javascript
class Cannon {
  constructor(x, y, world) {
    this.x = x;
    this.y = y;
    this.world = world;
    this.fireRate = 3000; // ms between shots (base: 3 seconds)
    this.lastShot = 0;
    this.cannonballs = [];
    this.upgrades = {
      fireRate: 0, // Max level: 14
      size: 0, // Max level: 10
    };
  }

  update(deltaTime, target) {
    // Handle firing logic and cannonball management
  }

  fire(targetX, targetY) {
    // Create and fire cannonball with physics
    // Uses random angle between MIN_ANGLE and MAX_ANGLE
  }

  render(ctx) {
    // Draw cannon sprite
  }
}
```

### 3. Castle Class (castle.js)

```javascript
class Castle {
  constructor(x, y, world) {
    this.x = x;
    this.y = y;
    this.world = world;
    this.blocks = [];
    this.isDestroyed = false;
    this.reward = 0;
  }

  generate() {
    // Procedurally generate castle structure
  }

  addBlock(x, y, material) {
    // Add physics body for block
  }

  checkDestroyed() {
    // Determine if castle is completely destroyed
  }

  render(ctx) {
    // Draw all castle blocks
  }
}
```

### 4. Block Class

```javascript
class Block {
  constructor(x, y, material, physicsBody) {
    this.material = material; // 'wood' or 'stone'
    this.health = material === "wood" ? 5 : 10; // Updated health values
    this.maxHealth = this.health;
    this.body = physicsBody; // Matter.js body
    this.isDestroyed = false;
    this.damageFlash = 0; // Visual damage indicator
  }

  takeDamage(amount) {
    // Handle damage and destruction with visual flash
  }

  update(deltaTime) {
    // Update damage flash animation
  }

  render(ctx) {
    // Draw block with damage visualization
  }
}
```

### 5. UI Manager (ui.js)

```javascript
class UIManager {
  constructor(upgradeManager, onUpgradePurchased) {
    this.upgradeManager = upgradeManager;
    this.onUpgradePurchased = onUpgradePurchased;
    this.money = 0;
    this.totalEarned = 0;
    this.isHidden = false;
    this.elements = {};
  }

  createHUD() {
    // Create HTML UI elements
  }

  updateStats() {
    // Update money, income rate, etc.
  }

  handleUpgrade(type) {
    // Process upgrade purchases with level caps
  }

  formatNumber(num) {
    // Format large numbers with k, m, b, t suffixes
  }

  showMoneyEarned(amount, x, y) {
    // Floating money text animation
  }
}
```

## Implementation Steps

### Step 1: Basic Setup

1. Create HTML canvas with proper dimensions
2. Include Matter.js library
3. Set up basic game loop with requestAnimationFrame
4. Initialize physics world with gravity

### Step 2: Cannon Implementation

1. Create cannon sprite/shape
2. Implement basic firing mechanism
3. Add cannonball physics bodies
4. Implement angle calculation and aiming

### Step 3: Castle System

1. Create block generation algorithm
2. Add block physics bodies with proper materials
3. Implement stable castle structures
4. Add destruction detection

### Step 4: Physics Integration

1. Set up collision detection between cannonballs and blocks
2. Implement damage system for blocks
3. Add realistic physics properties
4. Handle cleanup of destroyed objects

### Step 5: Upgrade System

1. Create upgrade data structure
2. Implement cost calculation
3. Add upgrade effects to cannon properties
4. Create save/load system for persistence

### Step 6: UI Development

1. Create HUD layout with CSS
2. Implement upgrade buttons and displays
3. Add money and statistics tracking
4. Create toggle functionality for HUD

### Step 7: Visual Polish

1. Add particle effects for explosions
2. Implement smooth animations
3. Add fireworks celebration
4. Create rolling cannon animation

## Key Algorithms

### Castle Generation Algorithm

```javascript
function generateCastle(width, height) {
  const structure = [];

  // Generate base layer (always full)
  for (let x = 0; x < width; x++) {
    structure.push({ x, y: 0, material: "stone" });
  }

  // Generate upper layers with decreasing probability
  for (let y = 1; y < height; y++) {
    const probability = Math.max(0.3, 1 - y / height);
    for (let x = 0; x < width; x++) {
      if (Math.random() < probability) {
        const material = Math.random() < 0.6 ? "wood" : "stone";
        structure.push({ x, y, material });
      }
    }
  }

  return structure;
}
```

### Accuracy Calculation

```javascript
function calculateFiringAngle(cannonX, cannonY, targetX, targetY, accuracy) {
  // Base angle to target
  const baseAngle = Math.atan2(targetY - cannonY, targetX - cannonX);

  // Sigma decreases with accuracy upgrades
  const sigma = Math.max(0.05, 0.26 - accuracy * 0.026); // 15° to 3° range

  // Add gaussian noise
  const noise = gaussianRandom() * sigma;

  return baseAngle + noise;
}

function gaussianRandom() {
  // Box-Muller transformation for gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

### Money Formatting

```javascript
function formatMoney(amount) {
  const suffixes = ["", "k", "m", "b", "t", "q"];
  let suffixIndex = 0;

  while (amount >= 1000 && suffixIndex < suffixes.length - 1) {
    amount /= 1000;
    suffixIndex++;
  }

  return `$${amount.toFixed(amount < 10 ? 1 : 0)}${suffixes[suffixIndex]}`;
}
```

## Configuration Constants (config.js)

```javascript
const CONFIG = {
  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 600,
  },

  CANNON: {
    X: 120,
    Y: 450,
    BASE_FIRE_RATE: 1000,
    BASE_ACCURACY: 0.26, // 15 degrees sigma
    BASE_SPEED: 200,
    BASE_SIZE: 8,
    BASE_WEIGHT: 0.5,
  },

  CASTLE: {
    X: 900,
    Y: 450,
    MIN_WIDTH: 4, // Updated from 3
    MAX_WIDTH: 8,
    MIN_HEIGHT: 4, // Updated from 3
    MAX_HEIGHT: 10,
    BASE_REWARD: 15,
  },

  UPGRADES: {
    BASE_COSTS: {
      fireRate: 10,
      size: 50,
    },
    COST_MULTIPLIER: 1.5,
    LEVEL_CAPS: {
      // New: Upgrade level caps
      fireRate: 14,
      size: 10,
    },
    EFFECTS: {
      fireRate: 0.08, // 8% faster per level
      size: 0.1, // 10% larger per level
    },
  },

  PHYSICS: {
    GRAVITY: 1.0, // Updated to realistic gravity
    WOOD_HEALTH: 5, // Updated from 2
    STONE_HEALTH: 10, // Updated from 5
    BLOCK_SIZE: 25,
    GROUND_Y: 500,
  },
};
```

## Performance Optimization

1. **Object Pooling**: Reuse cannonball objects instead of creating new ones
2. **Culling**: Remove physics bodies that are off-screen
3. **Batch Updates**: Group similar operations together
4. **Efficient Rendering**: Use dirty rectangles for partial redraws
5. **Memory Management**: Clean up destroyed objects immediately

## Testing Strategy

1. **Unit Tests**: Test individual functions and calculations
2. **Integration Tests**: Test physics interactions and game flow
3. **Performance Tests**: Monitor FPS and memory usage
4. **Playtest**: Balance testing for upgrade costs and progression

This implementation plan provides a roadmap for building the idle cannon game with proper architecture and scalable code structure.

## Future Implementation: Multi-World System

### World Manager Class

```javascript
class WorldManager {
  constructor() {
    this.currentWorld = 0;
    this.worlds = [
      {
        name: "Earth",
        gravity: 1.0,
        colors: { sky: "#87CEEB", grass: "#32CD32" },
      },
      {
        name: "Moon",
        gravity: 0.17,
        colors: { sky: "#1a1a1a", grass: "#C0C0C0" },
      },
      {
        name: "Mars",
        gravity: 0.38,
        colors: { sky: "#CD853F", grass: "#B22222" },
      },
      {
        name: "Mercury",
        gravity: 0.38,
        colors: { sky: "#2F2F2F", grass: "#696969" },
      },
      {
        name: "Venus",
        gravity: 0.9,
        colors: { sky: "#FFA500", grass: "#FFD700" },
      },
      {
        name: "Jupiter",
        gravity: 2.36,
        colors: { sky: "#DEB887", grass: "#8B4513" },
      },
      {
        name: "Saturn",
        gravity: 1.06,
        colors: { sky: "#F4A460", grass: "#DAA520" },
      },
      {
        name: "Uranus",
        gravity: 0.89,
        colors: { sky: "#4FD0E3", grass: "#40E0D0" },
      },
      {
        name: "Neptune",
        gravity: 1.13,
        colors: { sky: "#4169E1", grass: "#1E90FF" },
      },
      {
        name: "Pluto",
        gravity: 0.06,
        colors: { sky: "#191970", grass: "#B0C4DE" },
      },
      {
        name: "Ceres",
        gravity: 0.03,
        colors: { sky: "#2F4F4F", grass: "#708090" },
      },
    ];
  }

  canProgressToNextWorld(upgradeManager) {
    const upgrades = upgradeManager.getAllUpgradeLevels();
    return (
      upgrades.fireRate >= CONFIG.UPGRADES.LEVEL_CAPS.fireRate &&
      upgrades.size >= CONFIG.UPGRADES.LEVEL_CAPS.size
    );
  }

  progressToNextWorld(upgradeManager, physicsWorld) {
    if (this.currentWorld < this.worlds.length - 1) {
      this.currentWorld++;
      upgradeManager.resetUpgrades(); // Reset to level 0
      this.applyWorldSettings(physicsWorld);
      return true;
    }
    return false; // All worlds completed, ready for prestige
  }

  applyWorldSettings(physicsWorld) {
    const world = this.worlds[this.currentWorld];
    physicsWorld.setGravity(world.gravity);
    // Apply color scheme to rendering system
  }
}
```

### Prestige System Implementation

```javascript
class PrestigeManager {
  constructor() {
    this.prestigeLevel = 0;
    this.unlockedUpgrades = ["fireRate", "size"];
    this.cannonSkins = [
      "medieval",
      "pirate",
      "ww1",
      "ww2",
      "tank",
      "mortar",
      "bazooka",
      "missile",
      "futuristic",
    ];
  }

  canPrestige(worldManager) {
    return worldManager.currentWorld === 10; // Completed Ceres
  }

  prestige(upgradeManager, worldManager) {
    this.prestigeLevel++;

    // Reset world progress
    worldManager.currentWorld = 0;
    upgradeManager.resetAllProgress();

    // Unlock new upgrade type
    this.unlockNewUpgrade();

    // Unlock new cannon skin
    const skinIndex = Math.min(this.prestigeLevel, this.cannonSkins.length - 1);
    this.currentSkin = this.cannonSkins[skinIndex];
  }

  unlockNewUpgrade() {
    const upgradeProgression = [
      ["fireRate", "size"],
      ["fireRate", "size", "doubleShot"],
      ["fireRate", "size", "doubleShot", "fasterReload"],
      ["fireRate", "size", "doubleShot", "fasterReload", "blastShot"],
      [
        "fireRate",
        "size",
        "doubleShot",
        "fasterReload",
        "blastShot",
        "fireballs",
      ],
      [
        "fireRate",
        "size",
        "doubleShot",
        "fasterReload",
        "blastShot",
        "fireballs",
        "biggerCastles",
      ],
      [
        "fireRate",
        "size",
        "doubleShot",
        "fasterReload",
        "blastShot",
        "fireballs",
        "biggerCastles",
        "passiveIncome",
      ],
    ];

    const maxLevel = Math.min(
      this.prestigeLevel,
      upgradeProgression.length - 1
    );
    this.unlockedUpgrades = upgradeProgression[maxLevel];
  }

  getIncomeMultiplier() {
    return 1 + this.prestigeLevel * 0.1; // +10% per prestige level
  }
}
```

### Money Streak System

```javascript
class StreakManager {
  constructor() {
    this.castlesDestroyedSinceUpgrade = 0;
    this.maxMultiplier = 10;
  }

  onCastleDestroyed() {
    this.castlesDestroyedSinceUpgrade++;
  }

  onUpgradePurchased() {
    this.castlesDestroyedSinceUpgrade = 0;
  }

  getCurrentMultiplier() {
    return Math.min(this.castlesDestroyedSinceUpgrade, this.maxMultiplier);
  }

  calculateMoney(baseAmount, prestigeManager) {
    const streakMultiplier = this.getCurrentMultiplier();
    const prestigeMultiplier = prestigeManager.getIncomeMultiplier();
    return Math.floor(baseAmount * streakMultiplier * prestigeMultiplier);
  }
}
```

### Advanced Upgrade System

```javascript
class AdvancedUpgradeManager extends UpgradeManager {
  constructor() {
    super();
    this.prestigeUpgrades = {
      doubleShot: 0,
      fasterReload: 0,
      blastShot: 0,
      fireballs: 0,
      biggerCastles: 0,
      passiveIncome: 0,
    };
  }

  getUpgradeEffects() {
    return {
      ...super.getUpgradeEffects(),
      doubleShot: {
        chance: this.prestigeUpgrades.doubleShot * 0.05, // 5% per level
        maxChance: 0.5, // Cap at 50%
      },
      fasterReload: {
        reduction: this.prestigeUpgrades.fasterReload * 0.1, // 10% faster per level
        maxReduction: 0.8, // Cap at 80% reduction
      },
      blastShot: {
        chance: this.prestigeUpgrades.blastShot * 0.03, // 3% per level
        speed: 50 + this.prestigeUpgrades.blastShot * 5, // Base 50 + 5 per level
      },
      fireballs: {
        chance: this.prestigeUpgrades.fireballs * 0.04, // 4% per level
        explosionRadius: 30 + this.prestigeUpgrades.fireballs * 5, // Base 30 + 5 per level
      },
      biggerCastles: {
        widthBonus: this.prestigeUpgrades.biggerCastles,
        heightBonus: this.prestigeUpgrades.biggerCastles,
      },
      passiveIncome: {
        multiplier: this.prestigeUpgrades.passiveIncome * 0.01, // 1% of recent income per level
      },
    };
  }
}
```

## Implementation Roadmap

### Phase 5: World System (Month 2)

- [ ] Implement WorldManager class
- [ ] Create world transition UI
- [ ] Add gravity scaling system
- [ ] Implement world-specific color schemes
- [ ] Add world completion detection

### Phase 6: Prestige System (Month 3)

- [ ] Implement PrestigeManager class
- [ ] Create cannon skin system
- [ ] Add prestige UI and confirmation dialogs
- [ ] Implement income multiplier system
- [ ] Add prestige statistics tracking

### Phase 7: Advanced Upgrades (Month 4)

- [ ] Implement new upgrade types (Double Shot, Faster Reload, etc.)
- [ ] Create special projectile systems (Fireballs, Blast Shots)
- [ ] Add passive income generation
- [ ] Implement bigger castle generation
- [ ] Add upgrade effect UI indicators

### Phase 8: Money Streak System (Month 4)

- [ ] Implement StreakManager class
- [ ] Add streak UI indicators
- [ ] Create streak warning system for upgrades
- [ ] Add streak milestone celebrations
- [ ] Integrate with prestige income bonuses

### Phase 9: Polish & Integration (Month 5)

- [ ] Integrate all systems with save/load
- [ ] Add comprehensive tutorial system
- [ ] Implement achievement system
- [ ] Add advanced statistics tracking
- [ ] Performance optimization for long-term play
