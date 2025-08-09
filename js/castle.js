// Castle generation and management
import { CONFIG, MATERIALS } from './config.js';
import { randomInt, randomFloat, randomChoice } from './utils.js';

class Block {
  constructor(x, y, material, physicsBody, shape = 'square') {
    this.x = x;
    this.y = y;
    this.material = material;
    this.body = physicsBody;
    this.shape = shape;
    this.health = physicsBody.health;
    this.maxHealth = physicsBody.maxHealth;
    this.isDestroyed = false;
    this.damageFlash = 0;
    this.isProtected = true; // Start with protection enabled
    this.protectionTime = 5000; // 5 seconds of protection in milliseconds
  }

  takeDamage(amount = 1) {
    // Don't take damage while protected
    if (this.isProtected) {
      return false;
    }

    this.health -= amount;
    this.damageFlash = 1.0;

    if (this.health <= 0) {
      this.isDestroyed = true;
      return true; // Block was destroyed
    }
    return false; // Block still alive
  }

  update(deltaTime) {
    // Update protection timer
    if (this.isProtected && this.protectionTime > 0) {
      this.protectionTime -= deltaTime;
      if (this.protectionTime <= 0) {
        this.isProtected = false;
      }
    }

    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - deltaTime * 0.005);
    }
  }

  render(ctx) {
    if (this.isDestroyed) return;

    // The physics system will handle the basic rendering
    // This method can be used for additional visual effects

    // Render protection shield effect
    if (this.isProtected) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';

      // Create a subtle blue tint for protected blocks
      const protectionAlpha = 0.3 * (Math.sin(Date.now() * 0.003) * 0.3 + 0.7); // Pulsing effect
      ctx.fillStyle = `rgba(100, 150, 255, ${protectionAlpha})`;

      const pos = this.body.position;
      const vertices = this.body.vertices;

      if (vertices.length > 0) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.5})`;

      const pos = this.body.position;
      const vertices = this.body.vertices;

      if (vertices.length > 0) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // Render flag if this block has one
    if (this.hasFlag) {
      this.renderFlag(ctx);
    }
  }

  renderFlag(ctx) {
    const pos = this.body.position;
    const blockSize = CONFIG.PHYSICS.BLOCK_SIZE;

    // Calculate flag position relative to the block's center
    const flagX = pos.x;
    const flagY = pos.y - blockSize / 2; // Top of the block

    // Flag pole (black line)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY);
    ctx.lineTo(flagX, flagY - 25); // Flag pole is 25 pixels tall
    ctx.stroke();

    // Flag (red triangle)
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.moveTo(flagX, flagY - 25); // Top of pole
    ctx.lineTo(flagX + 15, flagY - 20); // Right point of flag
    ctx.lineTo(flagX, flagY - 15); // Bottom of flag attachment
    ctx.closePath();
    ctx.fill();

    // Flag outline
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

class Castle {
  constructor(x, y, physicsWorld, particleSystem, prestigeManager = null) {
    this.x = x;
    this.y = y;
    this.physics = physicsWorld;
    this.particles = particleSystem;
    this.prestigeManager = prestigeManager;
    this.blocks = [];
    this.isDestroyed = false;
    this.destructionTime = 0;
    this.fadingOut = false;
    this.fadeAlpha = 1.0;

    // Flag tracking
    this.flagBlock = null; // Will store the block that has the flag

    // Damage tracking for fallback destruction
    this.lastDamageTime = Date.now();
    this.noDamageTimeout = 20000; // 20 seconds

    // Protection system
    this.isProtected = true;
    this.protectionTime = 5000; // 5 seconds of protection in milliseconds

    console.log(
      'Castle initialized with no-damage timeout:',
      this.noDamageTimeout / 1000,
      'seconds and 5 second protection period'
    );

    this.generate();
  }

  generate() {
    // Clear any existing blocks
    this.clearBlocks();

    // Calculate bigger castles bonus
    let sizeMultiplier = 1.0;
    if (this.prestigeManager) {
      const biggerCastlesLevel =
        this.prestigeManager.prestigeUpgrades.biggerCastles;
      sizeMultiplier = 1.0 + biggerCastlesLevel * 0.1; // 10% increase per level
    }

    // Random castle dimensions with size multiplier
    const baseWidth = randomInt(
      CONFIG.CASTLE.MIN_WIDTH,
      CONFIG.CASTLE.MAX_WIDTH
    );
    const baseHeight = randomInt(
      CONFIG.CASTLE.MIN_HEIGHT,
      CONFIG.CASTLE.MAX_HEIGHT
    );

    const width = Math.floor(baseWidth * sizeMultiplier);
    const height = Math.floor(baseHeight * sizeMultiplier);

    // Generate castle structure
    const structure = this.generateStructure(width, height);

    // Find the highest blocks and select one for the flag
    const maxY = Math.max(...structure.map((block) => block.y));
    const topBlocks = structure.filter((block) => block.y === maxY);
    const flagBlockData =
      topBlocks[Math.floor(Math.random() * topBlocks.length)];
    flagBlockData.hasFlag = true; // Mark this block as having a flag

    // Create physics blocks (all are single 1x1 blocks now)
    for (const blockData of structure) {
      const blockX =
        this.x + (blockData.x - width / 2) * CONFIG.PHYSICS.BLOCK_SIZE;
      const blockY = this.y - blockData.y * CONFIG.PHYSICS.BLOCK_SIZE;

      const physicsBody = this.physics.createBlock(
        blockX,
        blockY,
        CONFIG.PHYSICS.BLOCK_SIZE,
        CONFIG.PHYSICS.BLOCK_SIZE,
        blockData.material,
        blockData.shape
      );

      const block = new Block(
        blockX,
        blockY,
        blockData.material,
        physicsBody,
        blockData.shape
      );

      // Mark this block as having a flag if it was selected
      if (blockData.hasFlag) {
        block.hasFlag = true;
        this.flagBlock = block;
      }

      this.blocks.push(block);
    }

    // Calculate reward based on castle complexity
    this.reward = this.calculateReward(width, height, structure.length);
  }

  generateStructure(width, height) {
    const structure = [];
    const occupiedGrid = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Track piece counts for balancing
    const pieceCounts = {
      square1x1: 0,
      circle1x1: 0,
    };

    // Generate base layer (always full stone for stability)
    for (let x = 0; x < width; x++) {
      structure.push({
        x: x,
        y: 0,
        material: MATERIALS.STONE,
        shape: 'square',
      });
      occupiedGrid[0][x] = true;
    }
    pieceCounts.square1x1 += width;

    // Generate upper layers with decreasing probability (creates towers and spires)
    for (let y = 1; y < height; y++) {
      // Probability decreases with height to create natural tower shapes
      const baseProbability = 0.4;

      for (let x = 0; x < width; x++) {
        if (occupiedGrid[y][x]) continue; // Already occupied

        if (Math.random() > baseProbability) continue;

        // Get possible pieces (1x1 square or circle)
        const possiblePieces = this.getPossiblePieces(
          x,
          y,
          width,
          height,
          occupiedGrid
        );

        if (possiblePieces.length === 0) continue;

        // Select piece with simple balancing
        const selectedPiece = this.selectPieceWithBalancing(
          possiblePieces,
          pieceCounts
        );

        if (
          selectedPiece &&
          this.canPlacePiece(selectedPiece, x, y, occupiedGrid)
        ) {
          const placedBlocks = this.placePiece(
            selectedPiece,
            x,
            y,
            occupiedGrid,
            structure
          );
          pieceCounts[selectedPiece.type]++;
        }
      }
    }

    return structure;
  }

  getPossiblePieces(x, y, width, height, occupiedGrid) {
    const pieces = [];

    // 1x1 Square (always available if we have support)
    pieces.push({ type: 'square1x1', width: 1, height: 1, shape: 'square' });

    // 1x1 Circle (only if not at leftmost or rightmost column)
    if (x > 0 && x < width - 1) {
      pieces.push({ type: 'circle1x1', width: 1, height: 1, shape: 'circle' });
    }

    return pieces;
  }

  hasSupport(x, y, pieceWidth, pieceHeight, occupiedGrid) {
    if (y === 0) return true; // Ground level

    // Check if there's at least one block supporting this piece from below
    for (let px = x; px < x + pieceWidth; px++) {
      if (occupiedGrid[y - 1] && occupiedGrid[y - 1][px]) {
        return true;
      }
    }
    return false;
  }

  spaceAvailable(x, y, width, height, occupiedGrid) {
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        if (occupiedGrid[py] && occupiedGrid[py][px]) {
          return false;
        }
      }
    }
    return true;
  }

  selectPieceWithBalancing(possiblePieces, pieceCounts) {
    if (possiblePieces.length === 0) return null;

    // Calculate total pieces placed
    const totalPieces = Object.values(pieceCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    // If we don't have many pieces yet, use simple random selection
    if (totalPieces < 10) {
      const randomIndex = Math.floor(Math.random() * possiblePieces.length);
      return possiblePieces[randomIndex];
    }

    // Base probability for each piece type
    const baseProbability = 1.0;

    // Adjust probabilities based on how many of each type we've used
    const weightedPieces = possiblePieces.map((piece) => {
      const currentCount = pieceCounts[piece.type] || 0;
      const expectedRatio = 1.0 / Object.keys(pieceCounts).length; // Equal distribution
      const actualRatio = totalPieces > 0 ? currentCount / totalPieces : 0;

      // Reduce probability if we've used too many of this type
      let weight = baseProbability;
      if (actualRatio > expectedRatio * 1.5) {
        weight *= 0.3; // Reduce probability significantly
      } else if (actualRatio > expectedRatio) {
        weight *= 0.7; // Reduce probability moderately
      } else if (actualRatio < expectedRatio * 0.5) {
        weight *= 1.5; // Increase probability for underused pieces
      }

      return { piece, weight };
    });

    // Select randomly based on weights
    const totalWeight = weightedPieces.reduce((sum, wp) => sum + wp.weight, 0);
    if (totalWeight <= 0) {
      // Fallback to random selection
      const randomIndex = Math.floor(Math.random() * possiblePieces.length);
      return possiblePieces[randomIndex];
    }

    let random = Math.random() * totalWeight;

    for (const wp of weightedPieces) {
      random -= wp.weight;
      if (random <= 0) {
        return wp.piece;
      }
    }

    // Fallback to first piece
    return possiblePieces[0];
  }

  placePiece(piece, x, y, occupiedGrid, structure) {
    const placedBlocks = [];
    const material = Math.random() < 0.5 ? MATERIALS.WOOD : MATERIALS.STONE;

    // All pieces are 1x1, so no grouping needed
    occupiedGrid[y][x] = true;

    const structureBlock = {
      x: x,
      y: y,
      material: material,
      shape: piece.shape,
    };
    structure.push(structureBlock);
    placedBlocks.push(structureBlock);

    return placedBlocks;
  }

  canPlacePiece(piece, x, y, occupiedGrid) {
    // Check if space is available for rectangular shape
    for (let py = y; py < y + piece.height; py++) {
      for (let px = x; px < x + piece.width; px++) {
        if (occupiedGrid[py] && occupiedGrid[py][px]) return false;
      }
    }
    return true;
  }

  calculateReward(width, height, blockCount) {
    // Base reward plus bonuses for size and complexity
    const sizeBonus = (width + height) * 2;
    const complexityBonus = blockCount * 1.5;
    return Math.floor(CONFIG.CASTLE.BASE_REWARD + sizeBonus + complexityBonus);
  }

  // Track when damage is taken to reset timeout
  onDamageTaken() {
    this.lastDamageTime = Date.now();
  }

  // Check if castle should be auto-destroyed due to no damage timeout
  shouldAutoDestroy() {
    const timeSinceLastDamage = Date.now() - this.lastDamageTime;
    const shouldDestroy = timeSinceLastDamage >= this.noDamageTimeout;

    if (shouldDestroy && window.location.search.includes('debug')) {
      console.log(
        `Castle should auto-destroy: ${(timeSinceLastDamage / 1000).toFixed(
          1
        )}s since last damage`
      );
    }

    return shouldDestroy;
  }

  update(deltaTime) {
    // Update protection timer
    if (this.isProtected && this.protectionTime > 0) {
      this.protectionTime -= deltaTime;
      if (this.protectionTime <= 0) {
        this.isProtected = false;
        console.log('Castle protection expired');
      }
    }

    // Check for auto-destruction due to no damage timeout
    if (!this.isDestroyed && this.shouldAutoDestroy()) {
      console.log('Castle auto-destroyed after 20 seconds of no damage');
      this.isDestroyed = true;
      this.onDestroyed();
      return;
    }

    // Update blocks
    for (const block of this.blocks) {
      block.update(deltaTime);
    }

    // Check for collisions with cannonballs
    this.handleCollisions();

    // Check if castle is destroyed
    if (!this.isDestroyed) {
      this.checkDestroyed();
    }

    // Handle destruction sequence
    if (this.isDestroyed) {
      this.destructionTime += deltaTime;

      // Start fading after fireworks
      if (this.destructionTime > 2000 && !this.fadingOut) {
        this.fadingOut = true;
      }

      if (this.fadingOut) {
        this.fadeAlpha = Math.max(0, this.fadeAlpha - deltaTime * 0.001);
      }
    }
  }

  handleCollisions() {
    // Handle cannonball-block collisions
    const collisions = this.physics.checkCollisions();

    for (const collision of collisions) {
      // Find the block that was hit
      const hitBlock = this.blocks.find(
        (block) => block.body === collision.block
      );

      if (hitBlock && !hitBlock.isDestroyed) {
        // Calculate collision velocity
        const cannonball = collision.cannonball;
        const cannonballData = collision.cannonballData;
        const velocity = cannonball.velocity;
        const speed = Math.sqrt(
          velocity.x * velocity.x + velocity.y * velocity.y
        );

        // Minimum velocity threshold to cause damage (prevents static damage)
        const minDamageVelocity = 5;

        if (speed >= minDamageVelocity) {
          // Cannonball hit disables protection (intentional player damage)
          if (hitBlock.isProtected) {
            hitBlock.isProtected = false;
          }

          // Calculate damage based on velocity
          let damage = this.calculateDamage(speed);

          // Check if this is a fireball
          const isFireball = cannonballData && cannonballData.isFireball;

          if (isFireball) {
            // Create explosion effect
            const pos = cannonball.position;
            this.particles.createFireballExplosion(pos.x, pos.y);

            // Damage all blocks within explosion radius
            const explosionRadius = 40; // 40 pixel radius
            const nearbyBlocks = this.physics.getBlocksInRadius(
              pos.x,
              pos.y,
              explosionRadius
            );

            for (const nearbyBlockBody of nearbyBlocks) {
              const nearbyBlock = this.blocks.find(
                (block) => block.body === nearbyBlockBody
              );
              if (nearbyBlock && !nearbyBlock.isDestroyed) {
                // Calculate distance-based damage (closer = more damage)
                const distance = Math.sqrt(
                  Math.pow(nearbyBlockBody.position.x - pos.x, 2) +
                    Math.pow(nearbyBlockBody.position.y - pos.y, 2)
                );
                const distanceFactor = Math.max(
                  0.3,
                  1 - distance / explosionRadius
                );
                const explosionDamage = Math.floor(damage * distanceFactor);

                // Disable protection for explosion damage
                if (nearbyBlock.isProtected) {
                  nearbyBlock.isProtected = false;
                }

                const wasDestroyed = nearbyBlock.takeDamage(explosionDamage);

                // Apply explosion force to push blocks away
                if (!wasDestroyed) {
                  const forceMultiplier = 0.03; // Base force strength
                  const forceStrength = forceMultiplier * distanceFactor;

                  // Calculate direction from explosion center to block
                  const deltaX = nearbyBlockBody.position.x - pos.x;
                  const deltaY = nearbyBlockBody.position.y - pos.y;

                  // Normalize the direction (avoid division by zero)
                  if (distance > 0.1) {
                    const normalizedX = deltaX / distance;
                    const normalizedY = deltaY / distance;

                    // Apply force away from explosion center
                    const forceX = normalizedX * forceStrength;
                    const forceY = normalizedY * forceStrength;

                    this.physics.applyForce(nearbyBlockBody, forceX, forceY);
                  }
                }

                if (wasDestroyed) {
                  // Create debris particles
                  const blockPos = nearbyBlockBody.position;
                  this.particles.createDebris(
                    blockPos.x,
                    blockPos.y,
                    nearbyBlock.material
                  );
                  // Remove from physics world
                  this.physics.removeBlock(nearbyBlockBody);
                }
              }
            }
          } else {
            // Normal cannonball damage
            const wasDestroyed = hitBlock.takeDamage(damage);

            if (wasDestroyed) {
              // Create debris particles
              const pos = hitBlock.body.position;
              this.particles.createDebris(pos.x, pos.y, hitBlock.material);
              // Remove from physics world
              this.physics.removeBlock(hitBlock.body);
            }
          }

          // Track that damage was taken
          this.onDamageTaken();
        }
      }
    }

    // Handle block-ground collisions
    this.handleGroundCollisions();

    // Handle block-block collisions
    this.handleBlockCollisions();
  }

  calculateDamage(speed) {
    // Scale: 0-1 damage for speeds 5-15, 1-5 damage for speeds 15-50+
    let damage = 0;
    const minDamageVelocity = 5;

    if (speed < 15) {
      // Low speed: 0-1 damage
      damage = Math.floor((speed - minDamageVelocity) / 10);
    } else if (speed < 30) {
      // Medium speed: 1-3 damage
      damage = 1 + Math.floor((speed - 15) / 7.5);
    } else {
      // High speed: 3-5 damage
      damage = Math.min(5, 3 + Math.floor((speed - 30) / 10));
    }

    // Ensure at least 1 damage for valid collisions
    return Math.max(1, damage);
  }

  handleGroundCollisions() {
    const minDamageVelocity = 8; // Higher threshold for ground damage
    const groundY = CONFIG.PHYSICS.GROUND_Y;

    for (const block of this.blocks) {
      if (block.isDestroyed) continue;

      const pos = block.body.position;
      const velocity = block.body.velocity;
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );

      // Check if block is close to ground and moving downward with enough velocity
      if (
        pos.y >= groundY - CONFIG.PHYSICS.BLOCK_SIZE &&
        velocity.y > minDamageVelocity
      ) {
        // Calculate damage based on impact velocity
        let damage = Math.floor(velocity.y / 10);
        damage = Math.max(1, Math.min(3, damage)); // 1-3 damage range

        const wasDestroyed = block.takeDamage(damage);

        // Track that damage was taken
        this.onDamageTaken();

        if (wasDestroyed) {
          // Create debris particles
          this.particles.createDebris(pos.x, pos.y, block.material);
          // Remove from physics world
          this.physics.removeBlock(block.body);
        }
      }
    }
  }

  handleBlockCollisions() {
    const minDamageVelocity = 10; // Threshold for block-block damage

    // Check all pairs of blocks for collisions
    for (let i = 0; i < this.blocks.length; i++) {
      if (this.blocks[i].isDestroyed) continue;

      for (let j = i + 1; j < this.blocks.length; j++) {
        if (this.blocks[j].isDestroyed) continue;

        const blockA = this.blocks[i];
        const blockB = this.blocks[j];

        // Check if blocks are colliding
        if (this.areBlocksColliding(blockA.body, blockB.body)) {
          const velocityA = blockA.body.velocity;
          const velocityB = blockB.body.velocity;

          const speedA = Math.sqrt(
            velocityA.x * velocityA.x + velocityA.y * velocityA.y
          );
          const speedB = Math.sqrt(
            velocityB.x * velocityB.x + velocityB.y * velocityB.y
          );

          // Calculate relative velocity for impact force
          const relativeSpeed = Math.sqrt(
            (velocityA.x - velocityB.x) * (velocityA.x - velocityB.x) +
              (velocityA.y - velocityB.y) * (velocityA.y - velocityB.y)
          );

          if (relativeSpeed > minDamageVelocity) {
            // Calculate damage for both blocks based on relative impact
            let damage = Math.floor(relativeSpeed / 15);
            damage = Math.max(1, Math.min(2, damage)); // 1-2 damage range

            // Apply damage to both blocks
            const blockADestroyed = blockA.takeDamage(damage);
            const blockBDestroyed = blockB.takeDamage(damage);

            // Track that damage was taken
            this.onDamageTaken();

            if (blockADestroyed) {
              const pos = blockA.body.position;
              this.particles.createDebris(pos.x, pos.y, blockA.material);
              this.physics.removeBlock(blockA.body);
            }

            if (blockBDestroyed) {
              const pos = blockB.body.position;
              this.particles.createDebris(pos.x, pos.y, blockB.material);
              this.physics.removeBlock(blockB.body);
            }
          }
        }
      }
    }
  }

  areBlocksColliding(bodyA, bodyB) {
    const bounds1 = bodyA.bounds;
    const bounds2 = bodyB.bounds;

    return !(
      bounds1.max.x < bounds2.min.x ||
      bounds1.min.x > bounds2.max.x ||
      bounds1.max.y < bounds2.min.y ||
      bounds1.min.y > bounds2.max.y
    );
  }

  checkDestroyed() {
    // Castle is destroyed if all blocks are destroyed or fell off screen
    const activeBlocks = this.blocks.filter((block) => {
      if (block.isDestroyed) return false;

      // Check if block fell off screen (any direction)
      const pos = block.body.position;

      // Check if block fell below screen
      if (pos.y > CONFIG.CANVAS.HEIGHT + 50) {
        block.isDestroyed = true;
        this.physics.removeBlock(block.body);
        return false;
      }

      // Check if block went too far left
      if (pos.x < -100) {
        block.isDestroyed = true;
        this.physics.removeBlock(block.body);
        return false;
      }

      // Check if block went too far right
      if (pos.x > CONFIG.CANVAS.WIDTH + 100) {
        block.isDestroyed = true;
        this.physics.removeBlock(block.body);
        return false;
      }

      // Check if block went too high up
      if (pos.y < -1000) {
        block.isDestroyed = true;
        this.physics.removeBlock(block.body);
        return false;
      }

      return true;
    });

    if (activeBlocks.length === 0) {
      this.isDestroyed = true;
      this.onDestroyed();
      return;
    }

    // Check if all remaining blocks are touching the ground
    const groundY = CONFIG.PHYSICS.GROUND_Y;
    const blockTouchingGround = activeBlocks.every((block) => {
      const pos = block.body.position;
      // Consider a block touching ground if it's within block size of ground level
      return pos.y >= groundY - CONFIG.PHYSICS.BLOCK_SIZE;
    });

    if (blockTouchingGround && activeBlocks.length > 0) {
      this.isDestroyed = true;
      this.onDestroyed();
    }
  }

  onDestroyed() {
    // Celebration effects
    this.particles.createFireworks(this.x, this.y - 100);

    // Add some extra fireworks
    setTimeout(() => {
      this.particles.createFireworks(this.x - 50, this.y - 150);
    }, 300);

    setTimeout(() => {
      this.particles.createFireworks(this.x + 50, this.y - 120);
    }, 600);
  }

  clearBlocks() {
    // Remove all blocks from physics world
    for (const block of this.blocks) {
      this.physics.removeBlock(block.body);
    }
    this.blocks = [];
  }

  render(ctx) {
    if (this.fadeAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // Render block damage effects
    for (const block of this.blocks) {
      if (!block.isDestroyed) {
        block.render(ctx);
      }
    }

    ctx.restore();
  }

  // Check if castle destruction sequence is complete
  isCompletelyDestroyed() {
    return this.isDestroyed && this.fadeAlpha <= 0;
  }

  getReward() {
    return this.reward;
  }
}

export default Castle;
