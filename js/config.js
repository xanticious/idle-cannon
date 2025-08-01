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
    BASE_SIZE: 8,
    SPEED: 20,
    SPEED_MIN: 20,
    SPEED_MAX: 20,
    WEIGHT: 1.0,
    MIN_ANGLE: -10, // -10 degrees
    MAX_ANGLE: Math.PI / 2, // 90 degrees
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
    LEVEL_CAPS: {
      fireRate: 14,
      size: 10,
    },
    EFFECTS: {
      fireRate: 0.08, // 8% faster per level
      size: 0.1, // 10% larger per level
    },
  },

  PHYSICS: {
    GRAVITY: 1.0,
    WOOD_HEALTH: 5,
    STONE_HEALTH: 10,
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

  WORLDS: [
    {
      id: 1,
      name: "Earth",
      gravity: 1.0,
      colors: {
        sky: "#87CEEB",
        grass: "#32CD32",
        wood: "#8B4513",
        stone: "#708090",
      },
      completionRequired: 5, // Castles needed after maxing upgrades
    },
    {
      id: 2,
      name: "Moon",
      gravity: 0.17,
      colors: {
        sky: "#1a1a1a",
        grass: "#C0C0C0",
        wood: "#A0A0A0",
        stone: "#808080",
      },
      completionRequired: 5,
    },
    {
      id: 3,
      name: "Mars",
      gravity: 0.38,
      colors: {
        sky: "#CD853F",
        grass: "#B22222",
        wood: "#A0522D",
        stone: "#8B4513",
      },
      completionRequired: 5,
    },
    {
      id: 4,
      name: "Mercury",
      gravity: 0.38,
      colors: {
        sky: "#2F2F2F",
        grass: "#696969",
        wood: "#555555",
        stone: "#444444",
      },
      completionRequired: 5,
    },
    {
      id: 5,
      name: "Venus",
      gravity: 0.9,
      colors: {
        sky: "#FFA500",
        grass: "#FFD700",
        wood: "#DAA520",
        stone: "#B8860B",
      },
      completionRequired: 5,
    },
    {
      id: 6,
      name: "Jupiter",
      gravity: 2.36,
      colors: {
        sky: "#DEB887",
        grass: "#8B4513",
        wood: "#654321",
        stone: "#5D4E37",
      },
      completionRequired: 5,
    },
    {
      id: 7,
      name: "Saturn",
      gravity: 1.06,
      colors: {
        sky: "#F4A460",
        grass: "#DAA520",
        wood: "#B8860B",
        stone: "#9ACD32",
      },
      completionRequired: 5,
    },
    {
      id: 8,
      name: "Uranus",
      gravity: 0.89,
      colors: {
        sky: "#4FD0E3",
        grass: "#40E0D0",
        wood: "#20B2AA",
        stone: "#008B8B",
      },
      completionRequired: 5,
    },
    {
      id: 9,
      name: "Neptune",
      gravity: 1.13,
      colors: {
        sky: "#4169E1",
        grass: "#1E90FF",
        wood: "#0000CD",
        stone: "#000080",
      },
      completionRequired: 5,
    },
    {
      id: 10,
      name: "Pluto",
      gravity: 0.06,
      colors: {
        sky: "#191970",
        grass: "#B0C4DE",
        wood: "#778899",
        stone: "#708090",
      },
      completionRequired: 5,
    },
    {
      id: 11,
      name: "Ceres",
      gravity: 0.03,
      colors: {
        sky: "#2F4F4F",
        grass: "#708090",
        wood: "#696969",
        stone: "#556B2F",
      },
      completionRequired: 5,
    },
  ],

  MONEY: {
    BASE_MULTIPLIER: 1,
    MAX_STREAK_MULTIPLIER: 10,
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
};
