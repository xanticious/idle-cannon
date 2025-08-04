// Physics wrapper and helpers using Matter.js
import { CONFIG, MATERIALS } from "./config.js";

class PhysicsWorld {
  constructor() {
    // Create engine and world
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;

    // Set gravity
    this.engine.world.gravity.y = CONFIG.PHYSICS.GRAVITY;

    // Create ground
    this.createGround();

    // Track bodies for cleanup
    this.cannonballs = [];
    this.blocks = [];
  }

  createGround() {
    const ground = Matter.Bodies.rectangle(
      CONFIG.CANVAS.WIDTH / 2,
      CONFIG.PHYSICS.GROUND_Y + 25,
      CONFIG.CANVAS.WIDTH,
      50,
      {
        isStatic: true,
        render: { fillStyle: CONFIG.COLORS.GRASS },
      }
    );
    Matter.World.add(this.world, ground);
  }

  createCannonball(x, y, radius, mass, velocity) {
    const cannonball = Matter.Bodies.circle(x, y, radius, {
      density: mass / (Math.PI * radius * radius),
      restitution: 0.3,
      friction: 0.5,
      frictionAir: 0.01,
      frictionStatic: 0.5,
      render: { fillStyle: "#2F2F2F" },
      label: "cannonball",
    });

    // Set initial velocity
    Matter.Body.setVelocity(cannonball, velocity);

    // Add to world and track
    Matter.World.add(this.world, cannonball);
    this.cannonballs.push({
      body: cannonball,
      createdAt: Date.now(),
    });

    return cannonball;
  }

  createBlock(x, y, width, height, material) {
    const isWood = material === MATERIALS.WOOD;
    const block = Matter.Bodies.rectangle(x, y, width, height, {
      density: isWood ? 0.001 : 0.002,
      restitution: 0.1,
      friction: 0.8,
      render: {
        fillStyle: isWood ? CONFIG.COLORS.WOOD : CONFIG.COLORS.STONE,
      },
    });

    // Add custom properties
    block.material = material;
    block.health = isWood
      ? CONFIG.PHYSICS.WOOD_HEALTH
      : CONFIG.PHYSICS.STONE_HEALTH;
    block.maxHealth = block.health;

    // Add to world and track
    Matter.World.add(this.world, block);
    this.blocks.push(block);

    return block;
  }

  update() {
    // Update physics engine
    Matter.Engine.update(this.engine, 16.67); // 60 FPS

    // Clean up old cannonballs that are off-screen or too old
    this.cleanupCannonballs();
  }

  cleanupCannonballs() {
    const now = Date.now();
    const maxAge = 10000; // 10 seconds
    const minVelocity = 0.5; // Velocity threshold to consider "stopped"

    for (let i = this.cannonballs.length - 1; i >= 0; i--) {
      const cb = this.cannonballs[i];
      const pos = cb.body.position;
      const velocity = cb.body.velocity;

      // Calculate current speed
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );

      // Remove if off-screen, too old, or stopped moving
      if (
        pos.x > CONFIG.CANVAS.WIDTH + 100 ||
        pos.y > CONFIG.CANVAS.HEIGHT + 100 ||
        now - cb.createdAt > maxAge ||
        speed < minVelocity
      ) {
        Matter.World.remove(this.world, cb.body);
        this.cannonballs.splice(i, 1);
      }
    }
  }

  removeBlock(block) {
    const index = this.blocks.indexOf(block);
    if (index > -1) {
      this.blocks.splice(index, 1);
      Matter.World.remove(this.world, block);
    }
  }

  clearBlocks() {
    for (const block of this.blocks) {
      Matter.World.remove(this.world, block);
    }
    this.blocks = [];
  }

  clearAllCannonballs() {
    for (const cb of this.cannonballs) {
      Matter.World.remove(this.world, cb.body);
    }
    this.cannonballs = [];
  }

  removeBody(body) {
    // Remove a specific body from the physics world
    Matter.World.remove(this.world, body);

    // Also remove from cannonballs array if it's a cannonball
    const cannonballIndex = this.cannonballs.findIndex(
      (cb) => cb.body === body
    );
    if (cannonballIndex > -1) {
      this.cannonballs.splice(cannonballIndex, 1);
    }
  }

  // Check for collisions between cannonballs and blocks
  checkCollisions() {
    const collisions = [];

    for (const cb of this.cannonballs) {
      for (const block of this.blocks) {
        if (this.areColliding(cb.body, block)) {
          collisions.push({
            cannonball: cb.body,
            block: block,
          });
        }
      }
    }

    return collisions;
  }

  areColliding(bodyA, bodyB) {
    const bounds1 = bodyA.bounds;
    const bounds2 = bodyB.bounds;

    return !(
      bounds1.max.x < bounds2.min.x ||
      bounds1.min.x > bounds2.max.x ||
      bounds1.max.y < bounds2.min.y ||
      bounds1.min.y > bounds2.max.y
    );
  }

  render(ctx) {
    // Render all physics bodies
    this.renderBodies(
      ctx,
      this.cannonballs.map((cb) => cb.body)
    );
    this.renderBodies(ctx, this.blocks);
  }

  renderBodies(ctx, bodies) {
    for (const body of bodies) {
      ctx.save();

      // Translate and rotate
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      // Set fill style
      ctx.fillStyle = body.render.fillStyle || "#888";

      // Draw based on body type
      if (body.label === "Circle Body") {
        ctx.beginPath();
        ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rectangle
        const vertices = body.vertices;
        if (vertices.length > 0) {
          ctx.beginPath();
          ctx.moveTo(
            vertices[0].x - body.position.x,
            vertices[0].y - body.position.y
          );
          for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(
              vertices[i].x - body.position.x,
              vertices[i].y - body.position.y
            );
          }
          ctx.closePath();
          ctx.fill();

          // Add stroke for blocks
          if (this.blocks.includes(body)) {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }
  }
}

export default PhysicsWorld;
