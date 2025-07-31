# Idle Cannon Game

A web-based idle game where you control a medieval cannon that automatically destroys castles and earn money to upgrade your cannon.

## How to Play

1. Open `index.html` in your web browser
2. Your cannon will automatically fire at the castle
3. Destroy all castle blocks to earn money
4. Use money to purchase upgrades
5. Watch your cannon become more powerful!

## Game Features

### 🏰 Castle Destruction

- Procedurally generated castles with wood and stone blocks
- Realistic physics simulation using Matter.js
- Different materials have different durability (wood: 5 hits, stone: 10 hits)

### 🔫 Cannon Mechanics

- Automatic firing with upgradeable fire rate
- Gaussian accuracy distribution (starts inaccurate, can be upgraded)
- Visual recoil and muzzle flash effects
- Cannonballs leave smoke trails

### 💰 Upgrade System

- **Fire Rate**: Shoot faster (base cost: $10, capped at level 14)
- **Size**: Larger cannonballs for bigger impact (base cost: $50, capped at level 10)

### 🎮 User Interface

- Real-time money counter with k/m/b/t formatting
- Upgrade buttons with costs and current levels
- Statistics tracking (total earned, income rate, castles destroyed)
- Collapsible HUD with hide/show toggle

### 🎨 Visual Effects

- Particle effects for explosions, debris, and fireworks
- Smooth animations for cannon movement and destruction
- Celebration fireworks when castle is destroyed
- Medieval-themed graphics with LEGO-style colorful blocks

### 💾 Save System

- Automatic saving every 30 seconds
- Progress saved to browser localStorage
- Simple offline earnings when returning to game

## Controls

- **Mouse**: Click upgrade buttons to purchase improvements
- **HUD Toggle**: Click "Hide HUD" to collapse the interface
- **Auto-play**: The game runs automatically once loaded

## Technical Details

### Technologies Used

- HTML5 Canvas for rendering
- Matter.js physics engine
- Vanilla JavaScript (ES6+)
- CSS3 for UI styling

### Performance Features

- Object pooling for particles
- Automatic cleanup of off-screen objects
- 60 FPS target with delta time updates
- Efficient collision detection

### Game Balance

- Exponential upgrade costs (1.5x multiplier)
- Income scales with upgrade investment
- Castle rewards based on size and complexity

## File Structure

```
idle-cannon/
├── index.html              # Main game file
├── js/
│   ├── main.js            # Game initialization and main loop
│   ├── cannon.js          # Cannon firing logic and upgrades
│   ├── castle.js          # Castle generation and destruction
│   ├── physics.js         # Matter.js physics wrapper
│   ├── upgrades.js        # Economy and upgrade system
│   ├── ui.js              # User interface management
│   ├── particles.js       # Visual effects system
│   ├── utils.js           # Utility functions
│   └── config.js          # Game configuration constants
├── DESIGN_DOCUMENT.md     # Detailed design specifications
└── IMPLEMENTATION_PLAN.md # Technical implementation guide
```

## Debug Mode

Add `?debug` to the URL to enable debug information display:

- FPS counter
- Active object counts
- Game state information
- Cannon statistics

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

## Future Enhancements

### Multi-World Progression System

Once players max out all upgrades (Fire Rate Level 14, Cannonball Size Level 10), they can progress through different worlds:

**Worlds Available:**

1. **Earth** (Default) - Standard gravity and Earth colors
2. **Moon** - Reduced gravity, grey/white color scheme
3. **Mars** - Moderate gravity, red/orange color scheme
4. **Mercury** - High gravity, metallic grey colors
5. **Venus** - Dense atmosphere simulation, yellow/orange hues
6. **Jupiter** - Very high gravity, swirling gas giant colors
7. **Saturn** - High gravity with ring particle effects
8. **Uranus** - Tilted world effects, blue-green colors
9. **Neptune** - Windy effects, deep blue colors
10. **Pluto** - Extremely low gravity, icy white/blue
11. **Ceres** - Final world with asteroid belt theme

Each world features unique gravity settings and color schemes that affect gameplay. Your upgrades reset to level 0 when entering each new world.

### Prestige System

After completing all 11 worlds (finishing Ceres), players can **Prestige** to restart from World 1 with powerful bonuses:

**Prestige Benefits:**

- **Cannon Skins**: Unlock new visual themes (Pirate, WW1, WW2, Tank, Mortar, Bazooka, Missile, Futuristic)
- **New Upgrades**: Each prestige level unlocks additional upgrade types
- **Income Bonus**: +10% castle reward money per prestige level

**Prestige Unlock Progression:**

- **Prestige 0**: Fire Rate, Cannonball Size (base upgrades)
- **Prestige 1**: Double Shot - % chance to fire two cannonballs simultaneously
- **Prestige 2**: Faster Reload - Reduces time between castle destruction and new castle spawn
- **Prestige 3**: Blast Shot - % chance to fire a super-fast horizontal cannonball
- **Prestige 4**: Fireballs - % chance for explosive cannonballs that damage nearby blocks
- **Prestige 5**: Bigger Castles - Increases maximum castle size and complexity
- **Prestige 6**: Passive Income - Earn money automatically over time

### Enhanced Money System

**Multiplier Streak System**: Money earned from castles increases with consecutive destructions without purchasing upgrades:

- Multiplier starts at 1x and increases by 1x per castle (max 10x)
- Resets to 1x when any upgrade is purchased
- Formula: `moneyEarned = castleValue × min(castlesDestroyedSinceLastUpgrade, 10)`

See `DESIGN_DOCUMENT.md` for additional planned features:

- Special cannonball types
- Achievement system
- Mobile touch controls
- Audio effects

---

**Enjoy destroying castles with your medieval cannon!** 🏰💥
