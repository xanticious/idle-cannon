// Game Configuration Constants
const CONFIG = {
  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 600,
  },

  CANNON: {
    X: 120,
    Y: 475,
    BASE_FIRE_RATE: 3000, // ms between shots
    BASE_SPEED: 18, // Keep this at 18 for an entertaining slow initial cannonball.
    BASE_SIZE: 8,
    BASE_WEIGHT: 0.75,
    MIN_ANGLE: (Math.PI * 11) / 180, // 11 degrees
    MAX_ANGLE: (Math.PI * 51) / 180, // 51 degrees
  },

  CASTLE: {
    X: 900,
    Y: 450,
    MIN_WIDTH: 4,
    MAX_WIDTH: 8,
    MIN_HEIGHT: 4,
    MAX_HEIGHT: 10,
    BASE_REWARD: 15,
  },

  UPGRADES: {
    BASE_COSTS: {
      fireRate: 10,
      size: 50,
    },
    COST_MULTIPLIER: 1.5,
    EFFECTS: {
      fireRate: 0.08, // 8% faster per level
      size: 0.1, // 10% larger per level
    },
  },

  PHYSICS: {
    GRAVITY: 1.0,
    WOOD_HEALTH: 2,
    STONE_HEALTH: 4,
    BLOCK_SIZE: 25,
    GROUND_Y: 500,
  },

  COLORS: {
    WOOD: "#8B4513",
    STONE: "#708090",
    CANNON: "#2F4F4F",
    GRASS: "#32CD32",
    SKY: "#87CEEB",
  },
};

// Material types
const MATERIALS = {
  WOOD: "wood",
  STONE: "stone",
};

// Game states
const GAME_STATES = {
  PLAYING: "playing",
  CASTLE_DESTROYED: "castle_destroyed",
  MOVING_CANNON: "moving_cannon",
};
