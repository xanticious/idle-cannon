// Castle generation and management
import { CONFIG, MATERIALS } from "./config.js";
import { randomInt, randomFloat, randomChoice } from "./utils.js";

class Block {
  constructor(x, y, material, physicsBody) {
    this.x = x;
    this.y = y;
    this.material = material;
    this.body = physicsBody;
    this.health = physicsBody.health;
    this.maxHealth = physicsBody.maxHealth;
    this.isDestroyed = false;
    this.damageFlash = 0;
  }

  takeDamage(amount = 1) {
    this.health -= amount;
    this.damageFlash = 1.0;

    if (this.health <= 0) {
      this.isDestroyed = true;
      return true; // Block was destroyed
    }
    return false; // Block still alive
  }

  update(deltaTime) {
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - deltaTime * 0.005);
    }
  }

  render(ctx) {
    if (this.isDestroyed) return;

    // The physics system will handle the basic rendering
    // This method can be used for additional visual effects

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
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
  }
}

class Castle {
  constructor(x, y, physicsWorld, particleSystem) {
    this.x = x;
    this.y = y;
    this.physics = physicsWorld;
    this.particles = particleSystem;
    this.blocks = [];
    this.isDestroyed = false;
    this.destructionTime = 0;
    this.fadingOut = false;
    this.fadeAlpha = 1.0;

    this.generate();
  }

  generate() {
    // Clear any existing blocks
    this.clearBlocks();

    // Random castle dimensions
    const width = randomInt(CONFIG.CASTLE.MIN_WIDTH, CONFIG.CASTLE.MAX_WIDTH);
    const height = randomInt(
      CONFIG.CASTLE.MIN_HEIGHT,
      CONFIG.CASTLE.MAX_HEIGHT
    );

    // Generate castle structure
    const structure = this.generateStructure(width, height);

    // Create physics blocks
    for (const blockData of structure) {
      const blockX =
        this.x + (blockData.x - width / 2) * CONFIG.PHYSICS.BLOCK_SIZE;
      const blockY = this.y - blockData.y * CONFIG.PHYSICS.BLOCK_SIZE;

      const physicsBody = this.physics.createBlock(
        blockX,
        blockY,
        CONFIG.PHYSICS.BLOCK_SIZE,
        CONFIG.PHYSICS.BLOCK_SIZE,
        blockData.material
      );

      const block = new Block(blockX, blockY, blockData.material, physicsBody);
      this.blocks.push(block);
    }

    // Calculate reward based on castle complexity
    this.reward = this.calculateReward(width, height, structure.length);
  }

  generateStructure(width, height) {
    const structure = [];

    // Generate base layer (always full for stability)
    for (let x = 0; x < width; x++) {
      structure.push({
        x: x,
        y: 0,
        material: MATERIALS.STONE, // Base is always stone for stability
      });
    }

    // Generate upper layers with decreasing probability
    for (let y = 1; y < height; y++) {
      // Probability decreases with height, but maintains some structure
      const baseProbability = Math.max(0.3, 1 - y / (height + 2));

      for (let x = 0; x < width; x++) {
        let probability = baseProbability;

        // Increase probability if there's support below
        const hasSupport = structure.some(
          (block) => block.x === x && block.y === y - 1
        );
        if (hasSupport) {
          probability = Math.min(0.9, probability + 0.3);
        }

        // Slightly increase probability for edge pieces (walls)
        if (x === 0 || x === width - 1) {
          probability = Math.min(0.8, probability + 0.2);
        }

        if (Math.random() < probability) {
          // Material selection: more wood at higher levels
          const woodProbability = Math.min(0.8, 0.4 + (y / height) * 0.4);
          const material =
            Math.random() < woodProbability ? MATERIALS.WOOD : MATERIALS.STONE;

          structure.push({
            x: x,
            y: y,
            material: material,
          });
        }
      }
    }

    return structure;
  }

  calculateReward(width, height, blockCount) {
    // Base reward plus bonuses for size and complexity
    const sizeBonus = (width + height) * 2;
    const complexityBonus = blockCount * 1.5;
    return Math.floor(CONFIG.CASTLE.BASE_REWARD + sizeBonus + complexityBonus);
  }

  update(deltaTime) {
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
        const velocity = cannonball.velocity;
        const speed = Math.sqrt(
          velocity.x * velocity.x + velocity.y * velocity.y
        );

        // Minimum velocity threshold to cause damage (prevents static damage)
        const minDamageVelocity = 5;

        if (speed >= minDamageVelocity) {
          // Calculate damage based on velocity
          // Scale: 0-1 damage for speeds 5-15, 1-5 damage for speeds 15-50+
          let damage = 0;

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
          damage = Math.max(1, damage);

          // Apply damage
          const wasDestroyed = hitBlock.takeDamage(damage);

          if (wasDestroyed) {
            // Create debris particles
            const pos = hitBlock.body.position;
            this.particles.createDebris(pos.x, pos.y, hitBlock.material);

            // Remove from physics world
            this.physics.removeBlock(hitBlock.body);
          }
        }
      }
    }

    // Handle block-ground collisions
    this.handleGroundCollisions();

    // Handle block-block collisions
    this.handleBlockCollisions();
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

      // Check if block fell off screen
      const pos = block.body.position;
      if (pos.y > CONFIG.CANVAS.HEIGHT + 50) {
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
