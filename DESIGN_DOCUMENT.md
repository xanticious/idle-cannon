# Idle Cannon - Design Document

## Game Overview

A web-based idle game featuring a medieval cannon that automatically fires cannonballs at procedurally generated castles. Players upgrade their cannon's capabilities to destroy increasingly challenging structures and earn currency.

## Core Gameplay Loop

1. Cannon automatically fires at castle
2. Cannonballs destroy castle blocks
3. When castle is destroyed, player earns money
4. Fireworks celebration, wreckage fades
5. Player spends money on upgrades
6. Repeat with improved cannon

## Technical Specifications

### Technology Stack

- **HTML5 Canvas** - Rendering and graphics
- **JavaScript (ES6+)** - Game logic and mechanics
- **Matter.js** - Physics engine for realistic collisions and destruction
- **CSS3** - UI styling and animations

### Canvas Specifications

- **Resolution**: 1200x600 pixels (scalable)
- **Aspect Ratio**: 2:1 landscape
- **Rendering**: 60 FPS target

## Game Mechanics

### Cannon System

- **Position**: Fixed at 10% from left edge of screen
- **Auto-fire**: Continuous shooting with upgradeable fire rate

### Castle Generation

- **Position**: Right side of screen (80-90% from left)
- **Materials**:
  - Wood blocks (brown/tan, 5 hits to destroy)
  - Stone blocks (gray, 10 hits to destroy)
- **Structure**: Random but stable configurations
- **Size**: Varies from 4x4 to 8x10 blocks
- **Colors**: Bright LEGO-style palette

### Physics Properties

- **Cannonball**:
  - Initial: radius=8px, mass=0.5, velocity=200px/s
  - Upgradeable: size, weight, speed
- **Blocks**:
  - Wood: mass=1.0, friction=0.8
  - Stone: mass=2.0, friction=0.9
- **Gravity**: 1.0 (realistic Earth gravity)

## Upgrade System

### Upgrade Categories

1. **Fire Rate** - Reduces time between shots (Level cap: 14)
2. **Size** - Increases cannonball radius (Level cap: 10)

### Pricing Formula

```
Cost = Base Cost × (1.5 ^ Level)
```

### Base Costs

- Fire Rate: $10
- Size: $50

### Upgrade Effects

- **Fire Rate**: Reduces cooldown by 8% per level
- **Size**: Increases radius by 10% per level

## User Interface

### HUD Layout

```
┌─────────────────────────────────────────────────┐
│ 💰 $1,234    [Hide HUD]                        │
│                                                 │
│ ┌─────────────┐ ┌─────────────┐                │
│ │ Fire Rate   │ │ Weight      │                │
│ │ Level: 5    │ │ Level: 3    │                │
│ │ Cost: $76   │ │ Cost: $169  │                │
│ │ [UPGRADE]   │ │ [UPGRADE]   │                │
│ └─────────────┘ └─────────────┘                │
│                                                 │
│ Stats:                                          │
│ • Total Earned: $12.5k                         │
│ • Income Rate: $145/min                        │
│ • Castles Destroyed: 23                        │
└─────────────────────────────────────────────────┘
```

### UI Features

- **Collapsible HUD**: Toggle button to hide/show upgrade panel
- **Real-time Stats**: Updates every second
- **Smooth Animations**: Button hover effects, number counting
- **Responsive**: Adapts to different screen sizes

## Visual Design

### Art Style

- **Theme**: Medieval fantasy meets modern toy blocks
- **Color Palette**:
  - Cannon: Dark metallic bronze (#8B4513)
  - Grass: Vibrant green (#32CD32)
  - Sky: Gradient blue (#87CEEB to #4169E1)
  - Blocks: LEGO-bright colors (red, blue, yellow, green)

### Animations

- **Cannon Firing**: Recoil animation, smoke puff, muzzle flash
- **Cannonball**: Trailing smoke particle effect
- **Block Destruction**: Crack animations, debris particles
- **Castle Completion**: Fireworks burst, fade-out effect
- **Cannon Movement**: Smooth rolling with wheel rotation

### Particle Effects

- **Muzzle Flash**: Yellow/orange burst
- **Smoke Trail**: Gray wispy trail behind cannonball
- **Block Debris**: Colored fragments matching block material
- **Fireworks**: Multi-colored explosions with sparkle trails

## Audio Design (Future Enhancement)

- **Cannon Fire**: Deep boom sound
- **Impact**: Crash/thud based on material hit
- **Block Break**: Satisfying crack/snap
- **Castle Destroyed**: Victory fanfare
- **UI Sounds**: Coin clink for purchases, button clicks

## Game Balance

### Progression Curve

- **Early Game** (0-10 castles): Slow fire rate, small cannonballs, learning basic mechanics
- **Mid Game** (10-50 castles): Balanced progression, both upgrades valuable
- **Late Game** (50+ castles): Approaching upgrade caps, building money streaks
- **World Progression**: 11 worlds with unique physics and visual themes
- **Prestige System**: Infinite progression with increasing complexity

### Economy Balance

- **Castle Reward**: $15-60 based on castle size and complexity
- **Upgrade ROI**: Each upgrade should pay for itself within 3-5 castles
- **Exponential Growth**: Player income should scale with upgrade costs
- **Streak System**: Money multiplier encourages strategic upgrade timing

## Performance Considerations

- **Object Pooling**: Reuse cannonball and particle objects
- **Culling**: Remove off-screen particles and debris
- **Optimization**: Limit simultaneous physics bodies to 100
- **Memory Management**: Clean up destroyed objects promptly

## Development Phases

### Phase 1: Core Mechanics (Week 1)

- [ ] Basic canvas setup and game loop
- [ ] Cannon and castle rendering
- [ ] Matter.js physics integration
- [ ] Simple firing mechanism

### Phase 2: Destruction System (Week 2)

- [ ] Block destruction logic
- [ ] Castle generation algorithm
- [ ] Victory conditions and progression

### Phase 3: Upgrade System (Week 3)

- [ ] Currency system
- [ ] Upgrade UI and logic
- [ ] Save/load functionality

### Phase 4: Polish & Effects (Week 4)

- [ ] Particle effects and animations
- [ ] Visual polish and juice
- [ ] Performance optimization
- [ ] Testing and bug fixes

## Future Enhancements

### Multi-World Progression System

When players reach maximum upgrade levels (Fire Rate Level 14, Cannonball Size Level 10), they unlock the ability to progress to new worlds. Each world features unique environmental conditions that affect gameplay.

#### World Progression

**World List & Characteristics:**

1. **Earth** (Starting World)

   - Gravity: 1.0 (standard)
   - Color Scheme: Green grass, blue sky, natural block colors
   - Special Features: None (baseline)

2. **Moon**

   - Gravity: 0.17 (low gravity, projectiles travel further)
   - Color Scheme: Grey/white lunar landscape, darker sky
   - Special Features: Slower block falls, longer flight times

3. **Mars**

   - Gravity: 0.38 (reduced gravity)
   - Color Scheme: Red/orange terrain, dusty atmosphere
   - Special Features: Dust particle effects

4. **Mercury**

   - Gravity: 0.38 (same as Mars but different environment)
   - Color Scheme: Metallic grey/silver, extreme lighting
   - Special Features: High contrast lighting effects

5. **Venus**

   - Gravity: 0.90 (nearly Earth-like)
   - Color Scheme: Yellow/orange dense atmosphere
   - Special Features: Particle density effects

6. **Jupiter**

   - Gravity: 2.36 (high gravity, faster falls)
   - Color Scheme: Swirling gas giant colors (browns, oranges, reds)
   - Special Features: Storm particle effects

7. **Saturn**

   - Gravity: 1.06 (slightly higher than Earth)
   - Color Scheme: Golden/yellow with ring particles
   - Special Features: Ring debris visual effects

8. **Uranus**

   - Gravity: 0.89 (slightly less than Earth)
   - Color Scheme: Blue-green methane atmosphere
   - Special Features: Tilted world visual effects

9. **Neptune**

   - Gravity: 1.13 (higher than Earth)
   - Color Scheme: Deep blue with wind streaks
   - Special Features: Wind particle effects

10. **Pluto**

    - Gravity: 0.06 (extremely low)
    - Color Scheme: Icy white/blue, dark space
    - Special Features: Floating ice crystal effects

11. **Ceres** (Final World)
    - Gravity: 0.03 (lowest gravity)
    - Color Scheme: Asteroid belt theme, rocky greys
    - Special Features: Floating debris, completion fanfare

#### World Transition Rules

- Upgrades reset to Level 0 when entering a new world
- Castle complexity scales appropriately for each world
- Gravity affects both cannonball trajectory and block physics
- Each world must be completed before unlocking the next

### Prestige System

After completing all 11 worlds (defeating Ceres), players can **Prestige** to restart the entire progression with powerful permanent bonuses.

#### Prestige Benefits

**Cannon Visual Progression:**
Each prestige level unlocks a new cannon skin that affects both cannon and projectile appearance:

1. **Prestige 1**: Pirate Cannon (weathered wood, iron cannonballs)
2. **Prestige 2**: WW1 Artillery (military green, explosive shells)
3. **Prestige 3**: WW2 Tank Cannon (armored steel, armor-piercing rounds)
4. **Prestige 4**: Modern Tank (desert camo, high-velocity shells)
5. **Prestige 5**: Mortar (compact design, arcing projectiles)
6. **Prestige 6**: Bazooka (rocket launcher, missile projectiles)
7. **Prestige 7**: Missile Launcher (futuristic, guided missiles)
8. **Prestige 8**: Futuristic Cannon (energy weapon, plasma projectiles)

**Economic Bonuses:**

- **Income Multiplier**: +10% castle reward money per prestige level
- **Compound Growth**: Higher prestige levels provide exponentially better progression

#### Progressive Upgrade Unlocks

Each prestige level unlocks a new upgrade category while retaining previous ones:

**Prestige Level 0** (Starting Upgrades):

- Fire Rate: Increases shooting frequency
- Cannonball Size: Increases projectile radius and impact area

**Prestige Level 1** - Unlock: **Double Shot**

- **Effect**: Percentage chance to fire two cannonballs simultaneously
- **Mechanics**: One projectile fires in the upper angle range, one in the lower range
- **Scaling**: Higher levels increase activation percentage

**Prestige Level 2** - Unlock: **Faster Reload**

- **Effect**: Reduces downtime between castle destruction and new castle spawn
- **Mechanics**: Decreases the 10-second pause period between castles
- **Scaling**: Each level reduces reload time by a percentage

**Prestige Level 3** - Unlock: **Blast Shot**

- **Effect**: Percentage chance to fire a high-velocity horizontal shot
- **Mechanics**: Special projectile travels perfectly horizontal at maximum speed
- **Scaling**: Higher levels increase both activation chance and projectile speed

**Prestige Level 4** - Unlock: **Fireballs**

- **Effect**: Percentage chance for explosive projectiles
- **Mechanics**: Red fireball projectiles explode on impact, damaging nearby blocks
- **Scaling**: Higher levels increase activation chance and explosion radius

**Prestige Level 5** - Unlock: **Bigger Castles**

- **Effect**: Increases maximum castle dimensions and complexity
- **Mechanics**: Raises width/height caps and adds more intricate structures
- **Scaling**: Each level increases maximum castle size parameters

**Prestige Level 6** - Unlock: **Passive Income**

- **Effect**: Generates money automatically over time
- **Mechanics**: Earns money per second based on recent income rate
- **Scaling**: Higher levels increase passive income multiplier

### Enhanced Economy System

#### Money Streak Multiplier

To make progression more rewarding and create decision points around upgrade timing:

**Streak Mechanics:**

```javascript
const maxMultiplier = 10;
const currentMultiplier = Math.min(
  castlesDestroyedSinceLastUpgrade,
  maxMultiplier
);
const moneyEarned = castleBaseValue * currentMultiplier;
```

**Behavior:**

- Multiplier starts at 1x for the first castle after any upgrade purchase
- Increases by 1x for each subsequent castle destroyed (2x, 3x, 4x...)
- Caps at 10x multiplier for maximum streak value
- **Resets to 1x** whenever ANY upgrade is purchased
- Creates strategic decision: buy upgrades now or build streak for higher income?

**Visual Feedback:**

- Display current streak multiplier in UI
- Show potential money earnings with current multiplier
- Warning notification before purchasing upgrades that would reset streak

#### Prestige Money Bonuses

**Cumulative Bonuses:**

- Each prestige level provides +10% bonus to ALL money earnings
- Prestige 3 character earns 30% more money from every castle
- Applies to both base castle rewards and streak multipliers
- Stacks multiplicatively with world completion bonuses

**Long-term Progression:**

- High prestige levels can achieve very high income rates
- Enables tackling increasingly difficult upgrade costs
- Provides meaningful long-term progression beyond initial world completion

### Technical Implementation Notes

#### World System Architecture

- Create `WorldManager` class to handle world transitions
- Each world has gravity coefficient and color palette configuration
- Save current world progress in localStorage
- Smooth transitions between world environments

#### Prestige System Architecture

- Track prestige level and unlocked upgrades in save data
- Modular upgrade system supports dynamic addition of new upgrade types
- Visual cannon system for skin management and projectile appearance
- Achievement system integration for prestige milestone rewards

#### Performance Considerations

- Lazy loading of world-specific assets
- Efficient particle system scaling for environmental effects
- Memory management for multiple upgrade types and visual effects

This enhanced progression system provides hundreds of hours of engaging gameplay with meaningful choices, visual progression, and long-term goals while maintaining the core idle cannon destruction mechanics.

## Technical Implementation Notes

- Use `requestAnimationFrame` for smooth 60fps rendering
- Implement delta time for frame-rate independent updates
- Use ES6 modules for code organization
- Implement proper MVC pattern for maintainability
- Add comprehensive error handling and logging

---

This design document serves as the blueprint for development. Each section can be expanded with more technical details as implementation progresses.
