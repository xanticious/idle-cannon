// Particle Effects System

class Particle {
  constructor(x, y, vx, vy, life, color, size = 2) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.gravity = 0.1;
    this.active = true;
  }

  update(deltaTime) {
    if (!this.active) return;

    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.vy += this.gravity * deltaTime;

    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;

    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.particlePool = new ObjectPool(
      () => new Particle(0, 0, 0, 0, 1000, "#fff"),
      (particle) => {
        particle.active = false;
        particle.life = 1000;
      }
    );
  }

  // Muzzle flash effect
  createMuzzleFlash(x, y) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(50, 150);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = randomFloat(200, 400);
      const color = randomChoice(["#FFD700", "#FF6347", "#FFA500"]);
      const size = randomFloat(2, 5);

      this.addParticle(x, y, vx, vy, life, color, size);
    }
  }

  // Smoke trail for cannonball
  createSmokeTrail(x, y) {
    for (let i = 0; i < 3; i++) {
      const vx = randomFloat(-20, 20);
      const vy = randomFloat(-30, -10);
      const life = randomFloat(500, 800);
      const color = `rgba(128, 128, 128, ${randomFloat(0.3, 0.8)})`;
      const size = randomFloat(3, 6);

      this.addParticle(x, y, vx, vy, life, color, size);
    }
  }

  // Block destruction debris
  createDebris(x, y, material, count = 8) {
    const baseColor = material === MATERIALS.WOOD ? "#8B4513" : "#708090";

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomFloat(100, 200);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - randomFloat(50, 100);
      const life = randomFloat(800, 1200);
      const size = randomFloat(2, 4);

      this.addParticle(x, y, vx, vy, life, baseColor, size);
    }
  }

  // Fireworks celebration
  createFireworks(x, y) {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
    ];

    // Main burst
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25 + randomFloat(-0.2, 0.2);
      const speed = randomFloat(80, 120);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const life = randomFloat(1000, 1500);
      const color = randomChoice(colors);
      const size = randomFloat(2, 4);

      this.addParticle(x, y, vx, vy, life, color, size);
    }

    // Secondary sparkles
    setTimeout(() => {
      for (let i = 0; i < 15; i++) {
        const offsetX = randomFloat(-50, 50);
        const offsetY = randomFloat(-50, 50);
        const angle = Math.random() * Math.PI * 2;
        const speed = randomFloat(30, 60);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const life = randomFloat(600, 1000);
        const color = randomChoice(colors);
        const size = randomFloat(1, 3);

        this.addParticle(x + offsetX, y + offsetY, vx, vy, life, color, size);
      }
    }, 300);
  }

  addParticle(x, y, vx, vy, life, color, size = 2) {
    const particle = this.particlePool.get();
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = life;
    particle.maxLife = life;
    particle.color = color;
    particle.size = size;
    particle.active = true;

    this.particles.push(particle);
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);

      if (!particle.active) {
        this.particles.splice(i, 1);
        this.particlePool.release(particle);
      }
    }
  }

  render(ctx) {
    for (const particle of this.particles) {
      particle.render(ctx);
    }
  }

  clear() {
    for (const particle of this.particles) {
      this.particlePool.release(particle);
    }
    this.particles = [];
  }
}
