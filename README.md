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
- Different materials have different durability (wood: 2 hits, stone: 4 hits)

### 🔫 Cannon Mechanics

- Automatic firing with upgradeable fire rate
- Gaussian accuracy distribution (starts inaccurate, can be upgraded)
- Visual recoil and muzzle flash effects
- Cannonballs leave smoke trails

### 💰 Upgrade System

- **Fire Rate**: Shoot faster (base cost: $10)
- **Weight**: Heavier cannonballs for more damage (base cost: $25)
- **Size**: Larger cannonballs for bigger impact (base cost: $50)
- **Speed**: Faster projectiles (base cost: $75)
- **Accuracy**: More precise aiming (base cost: $100)

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

See `DESIGN_DOCUMENT.md` for planned features:

- Prestige system
- Special cannonball types
- Achievement system
- Mobile touch controls
- Audio effects

---

**Enjoy destroying castles with your medieval cannon!** 🏰💥
