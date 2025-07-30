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
    this.fireRate = 1000; // ms between shots
    this.lastShot = 0;
    this.cannonballs = [];
    this.upgrades = {
      fireRate: 0,
      weight: 0,
      size: 0,
      speed: 0,
      accuracy: 0,
    };
  }

  update(deltaTime, target) {
    // Handle firing logic and cannonball management
  }

  fire(targetX, targetY) {
    // Create and fire cannonball with physics
  }

  calculateAngle(targetX, targetY) {
    // Calculate firing angle with accuracy variance
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
  constructor(x, y, material, world) {
    this.material = material; // 'wood' or 'stone'
    this.health = material === "wood" ? 2 : 5;
    this.maxHealth = this.health;
    this.body = null; // Matter.js body
    this.isDestroyed = false;
  }

  takeDamage(amount) {
    // Handle damage and destruction
  }

  render(ctx) {
    // Draw block with damage visualization
  }
}
```

### 5. UI Manager (ui.js)

```javascript
class UIManager {
  constructor(game) {
    this.game = game;
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
    // Process upgrade purchases
  }

  formatNumber(num) {
    // Format large numbers with k, m, b, t suffixes
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
    MIN_WIDTH: 3,
    MAX_WIDTH: 8,
    MIN_HEIGHT: 3,
    MAX_HEIGHT: 10,
  },

  UPGRADES: {
    BASE_COSTS: {
      fireRate: 10,
      weight: 25,
      size: 50,
      speed: 75,
      accuracy: 100,
    },
    COST_MULTIPLIER: 1.5,
    EFFECTS: {
      fireRate: 0.08, // 8% faster per level
      weight: 0.15, // 15% heavier per level
      size: 0.1, // 10% larger per level
      speed: 0.12, // 12% faster per level
      accuracy: 0.1, // 10% more accurate per level
    },
  },

  PHYSICS: {
    GRAVITY: 0.8,
    WOOD_HEALTH: 2,
    STONE_HEALTH: 5,
    BLOCK_SIZE: 30,
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
