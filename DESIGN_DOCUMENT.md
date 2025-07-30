# Idle Cannon - Design Document

## Game Overview

A web-based idle game featuring a medieval cannon that automatically fires cannonballs at procedurally generated castles. Players upgrade their cannon's capabilities to destroy increasingly challenging structures and earn currency.

## Core Gameplay Loop

1. Cannon automatically fires at castle
2. Cannonballs destroy castle blocks
3. When castle is destroyed, player earns money
4. Fireworks celebration, wreckage fades
5. Cannon rolls right to reveal new castle
6. Player spends money on upgrades
7. Repeat with improved cannon

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
- **Firing Angle**: 20-50 degrees (randomized with gaussian distribution)
- **Auto-fire**: Continuous shooting with upgradeable fire rate
- **Movement**: Rolls right after castle destruction (smooth animation)

### Accuracy System

```
Initial Sigma: 15 degrees
Target Angle: Calculated to hit near-side of castle
Actual Angle: Normal distribution around target angle
Accuracy Upgrade: Reduces sigma by 10% per level
```

### Castle Generation

- **Position**: Right side of screen (80-90% from left)
- **Materials**:
  - Wood blocks (brown/tan, 2-3 hits to destroy)
  - Stone blocks (gray, 4-6 hits to destroy)
- **Structure**: Random but stable configurations
- **Size**: Varies from 3x3 to 8x10 blocks
- **Colors**: Bright LEGO-style palette

### Physics Properties

- **Cannonball**:
  - Initial: radius=8px, mass=0.5, velocity=200px/s
  - Upgradeable: size, weight, speed
- **Blocks**:
  - Wood: mass=1.0, friction=0.8
  - Stone: mass=2.0, friction=0.9
- **Gravity**: 0.8 (slightly reduced for dramatic effect)

## Upgrade System

### Upgrade Categories

1. **Fire Rate** - Reduces time between shots
2. **Weight** - Increases cannonball mass (more destructive force)
3. **Size** - Increases cannonball radius (larger impact area)
4. **Speed** - Increases initial velocity
5. **Accuracy** - Reduces firing angle variance

### Pricing Formula

```
Cost = Base Cost × (1.5 ^ Level)
```

### Base Costs

- Fire Rate: $10
- Weight: $25
- Size: $50
- Speed: $75
- Accuracy: $100

### Upgrade Effects

- **Fire Rate**: Reduces cooldown by 8% per level
- **Weight**: Increases mass by 15% per level
- **Size**: Increases radius by 10% per level
- **Speed**: Increases velocity by 12% per level
- **Accuracy**: Reduces sigma by 10% per level

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

- **Early Game** (0-10 castles): High inaccuracy, slow fire rate
- **Mid Game** (10-50 castles): Balanced progression, all upgrades viable
- **Late Game** (50+ castles): Focus on optimization, prestige mechanics

### Economy Balance

- **Castle Reward**: $10-50 based on castle size and complexity
- **Upgrade ROI**: Each upgrade should pay for itself within 3-5 castles
- **Exponential Growth**: Player income should scale with upgrade costs

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

- **Prestige System**: Reset progress for permanent bonuses
- **Special Cannonballs**: Explosive, piercing, multi-shot
- **Castle Themes**: Different architectural styles
- **Achievements**: Unlock rewards for specific goals
- **Mobile Support**: Touch controls and responsive design

## Technical Implementation Notes

- Use `requestAnimationFrame` for smooth 60fps rendering
- Implement delta time for frame-rate independent updates
- Use ES6 modules for code organization
- Implement proper MVC pattern for maintainability
- Add comprehensive error handling and logging

---

This design document serves as the blueprint for development. Each section can be expanded with more technical details as implementation progresses.
