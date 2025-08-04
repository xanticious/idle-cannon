// Firing Table Builder - Creates trajectory lookup tables for each world
import { CONFIG } from "./config.js";

// Import minimum damage velocity for accurate hit detection
const MIN_DAMAGE_VELOCITY = 5; // From castle.js handleCollisions method

class FiringTableBuilder {
  constructor(canvas, ctx, physics, cannon, worldManager) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.physics = physics;
    this.cannon = cannon;
    this.worldManager = worldManager;

    // Grid settings for dot paper
    this.gridSize = 10; // pixels between dots
    this.dotSize = 2;
    this.dots = [];
    this.hitDots = new Set();

    // Build process state
    this.currentAngle = 0;
    this.maxAngle = 360;
    this.isBuilding = false;
    this.isWaitingForCannonball = false;
    this.currentCannonball = null;
    this.firingTable = {};
    this.testFireStartTime = 0;
    this.maxWaitTime = 10000; // 10 seconds max wait per shot
    this.originalNoTargetsTimeout = null; // Store original cannon timeout

    this.initializeGrid();
  }

  initializeGrid() {
    this.dots = [];
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      for (let y = 0; y < this.canvas.height; y += this.gridSize) {
        this.dots.push({
          x: x,
          y: y,
          hit: false,
        });
      }
    }
  }

  async startBuilding() {
    console.log(
      `Starting firing table build for World ${this.worldManager.currentWorldId}`
    );
    console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
    console.log(`Grid size: ${this.gridSize}, Total dots: ${this.dots.length}`);

    this.isBuilding = true;
    this.currentAngle = 0;
    this.firingTable = {};

    // Store original timeout and disable auto-destroy during build
    this.originalNoTargetsTimeout = this.cannon.noTargetsTimeout;
    this.cannon.noTargetsTimeout = Infinity; // Disable timeout
    console.log(
      "Disabled cannon auto-destroy timeout during firing table build"
    );

    // Initialize firing table structure
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      this.firingTable[x] = {};
      for (let y = 0; y < this.canvas.height; y += this.gridSize) {
        this.firingTable[x][y] = [];
      }
    }

    console.log(`Initialized firing table structure`);
    await this.testNextAngle();
  }

  async testNextAngle() {
    if (this.currentAngle >= this.maxAngle) {
      this.finishBuilding();
      return;
    }

    console.log(`Testing angle: ${this.currentAngle} degrees`);

    // Clear hit dots from previous test
    this.hitDots.clear();
    this.dots.forEach((dot) => (dot.hit = false));

    // Convert angle to radians and set cannon angle
    const angleRadians = (this.currentAngle * Math.PI) / 180;
    this.cannon.angle = angleRadians;

    // Fire cannonball
    await this.cannon.fire([], true); // Force fire regardless of cooldown
    this.isWaitingForCannonball = true;
    this.testFireStartTime = Date.now();

    // Find the cannonball that was just fired
    this.findCurrentCannonball();
  }

  findCurrentCannonball() {
    // Look for the most recently created cannonball
    const bodies = this.physics.engine.world.bodies;
    console.log(`Looking for cannonball among ${bodies.length} bodies`);

    for (let i = bodies.length - 1; i >= 0; i--) {
      const body = bodies[i];
      if (body.label === "cannonball") {
        this.currentCannonball = body;
        console.log(
          `Found cannonball at position (${body.position.x}, ${body.position.y})`
        );
        return;
      }
    }

    // If no cannonball found, log warning and try again after a short delay
    console.warn(
      `No cannonball found after firing at angle ${this.currentAngle}, retrying...`
    );

    // Wait a bit and try again - sometimes the cannonball takes a frame to appear
    setTimeout(() => {
      const retryBodies = this.physics.engine.world.bodies;
      for (let i = retryBodies.length - 1; i >= 0; i--) {
        const body = retryBodies[i];
        if (body.label === "cannonball") {
          this.currentCannonball = body;
          console.log(
            `Found cannonball on retry at position (${body.position.x}, ${body.position.y})`
          );
          return;
        }
      }

      // Still no cannonball found - skip this angle and move to next
      console.error(
        `Still no cannonball found after retry for angle ${this.currentAngle}, skipping to next angle`
      );
      this.currentAngle++;
      if (this.currentAngle >= this.maxAngle) {
        this.finishBuilding();
      } else {
        this.testNextAngle();
      }
    }, 50);
  }

  update() {
    if (!this.isBuilding) return;

    if (this.isWaitingForCannonball && this.currentCannonball) {
      // Check if cannonball hit the ground - account for cannonball radius
      const ballRadius = this.currentCannonball.circleRadius || 8;
      const hitGround =
        this.currentCannonball.position.y + ballRadius >=
        CONFIG.PHYSICS.GROUND_Y;

      // Check if cannonball has come to rest or fallen off screen
      const isAtRest =
        Math.abs(this.currentCannonball.velocity.x) < 0.1 &&
        Math.abs(this.currentCannonball.velocity.y) < 0.1;
      const isOffScreen =
        this.currentCannonball.position.y > this.canvas.height + 100;
      const timeExpired =
        Date.now() - this.testFireStartTime > this.maxWaitTime;

      if (hitGround || isAtRest || isOffScreen || timeExpired) {
        if (hitGround) {
          console.log(
            `Cannonball hit ground at angle ${this.currentAngle}°, moving to next angle`
          );
        } else if (timeExpired) {
          console.log(
            `Test timeout at angle ${this.currentAngle}°, moving to next angle`
          );
        }

        // Record the hit dots for this angle
        this.recordHitsForAngle();

        // Remove the cannonball if it still exists
        if (
          this.currentCannonball &&
          this.physics.engine.world.bodies.includes(this.currentCannonball)
        ) {
          this.physics.removeBody(this.currentCannonball);
        }
        this.currentCannonball = null;
        this.isWaitingForCannonball = false;

        // Move to next angle immediately
        this.currentAngle++;
        this.testNextAngle(); // Remove setTimeout to prevent timing issues
      } else {
        // Check for collisions with dots
        this.checkDotCollisions();
      }
    }
  }

  checkDotCollisions() {
    if (!this.currentCannonball) return;

    const ballX = this.currentCannonball.position.x;
    const ballY = this.currentCannonball.position.y;
    const ballRadius = this.currentCannonball.circleRadius || 8;

    // Calculate current velocity to check if it meets minimum damage threshold
    const velocity = this.currentCannonball.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    // Only count hits if the cannonball has enough velocity to cause damage
    if (speed < MIN_DAMAGE_VELOCITY) {
      return; // Skip collision detection for slow-moving cannonballs
    }

    this.dots.forEach((dot, index) => {
      if (!dot.hit) {
        const distance = Math.sqrt(
          Math.pow(ballX - dot.x, 2) + Math.pow(ballY - dot.y, 2)
        );

        if (distance <= ballRadius + this.dotSize) {
          dot.hit = true;
          this.hitDots.add(index);
        }
      }
    });
  }

  recordHitsForAngle() {
    this.hitDots.forEach((dotIndex) => {
      const dot = this.dots[dotIndex];
      if (dot.hit) {
        // Round to grid coordinates
        const gridX = Math.round(dot.x / this.gridSize) * this.gridSize;
        const gridY = Math.round(dot.y / this.gridSize) * this.gridSize;

        if (this.firingTable[gridX] && this.firingTable[gridX][gridY]) {
          if (!this.firingTable[gridX][gridY].includes(this.currentAngle)) {
            this.firingTable[gridX][gridY].push(this.currentAngle);
          }
        }
      }
    });
  }

  finishBuilding() {
    console.log("Firing table build complete!");
    this.isBuilding = false;

    // Restore original cannon timeout
    this.cannon.noTargetsTimeout = this.originalNoTargetsTimeout;
    console.log("Restored cannon auto-destroy timeout");

    // Clean up the firing table (remove empty entries)
    const cleanTable = {};
    for (const x in this.firingTable) {
      for (const y in this.firingTable[x]) {
        if (this.firingTable[x][y].length > 0) {
          if (!cleanTable[x]) cleanTable[x] = {};
          cleanTable[x][y] = this.firingTable[x][y];
        }
      }
    }

    // Generate the export string
    const exportString = this.generateExportString(cleanTable);

    // Navigate to results page with the data
    this.navigateToResultsPage(exportString);
  }

  cleanup() {
    // Restore cannon timeout if it was modified
    if (this.originalNoTargetsTimeout !== null) {
      this.cannon.noTargetsTimeout = this.originalNoTargetsTimeout;
      this.originalNoTargetsTimeout = null;
      console.log("Cleaned up firing table builder - restored cannon timeout");
    }
    this.isBuilding = false;
  }

  generateExportString(table) {
    const worldId = this.worldManager.currentWorldId;
    let output = `// Firing Table Data for World ${worldId}\n`;
    output += `// Generated on ${new Date().toISOString()}\n`;
    output += `export default {\n`;

    const sortedX = Object.keys(table).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    for (let i = 0; i < sortedX.length; i++) {
      const x = sortedX[i];
      output += `  ${x}: {\n`;

      const sortedY = Object.keys(table[x]).sort(
        (a, b) => parseInt(a) - parseInt(b)
      );

      for (let j = 0; j < sortedY.length; j++) {
        const y = sortedY[j];
        const angles = table[x][y].sort((a, b) => a - b);
        output += `    ${y}: [${angles.join(", ")}]`;
        if (j < sortedY.length - 1) output += ",";
        output += "\n";
      }

      output += `  }`;
      if (i < sortedX.length - 1) output += ",";
      output += "\n";
    }

    output += `};\n`;
    return output;
  }

  navigateToResultsPage(firingTableData) {
    // Store the data in sessionStorage so it persists across page navigation
    sessionStorage.setItem("firingTableData", firingTableData);
    sessionStorage.setItem("worldId", this.worldManager.currentWorldId);

    // Navigate to the results page
    window.location.href = "firing-table-results.html";
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Firing table data copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback: log the data to console
      console.log("Firing table data (copy manually):");
      console.log(text);
    }
  }

  showCompletionMessage() {
    // Create and show a completion overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;

    overlay.innerHTML = `
      <h3>Firing Table Build Complete!</h3>
      <p>All angles have been checked for World ${this.worldManager.currentWorldId}.</p>
      <p>The data for this world has been copied to your clipboard.</p>
      <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 15px;">Close</button>
    `;

    document.body.appendChild(overlay);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, 10000);
  }

  render() {
    if (!this.worldManager.buildTableMode) return;

    // Draw dot paper
    this.ctx.save();

    // Draw grid dots
    this.dots.forEach((dot) => {
      this.ctx.fillStyle = dot.hit ? "#00ff00" : "#cccccc";
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, this.dotSize, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Draw status text
    if (this.isBuilding) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      this.ctx.fillRect(10, 10, 300, 80);

      this.ctx.fillStyle = "white";
      this.ctx.font = "16px Arial";
      this.ctx.fillText(
        `Building Firing Table for World ${this.worldManager.currentWorldId}`,
        20,
        30
      );
      this.ctx.fillText(
        `Testing angle: ${this.currentAngle}° / ${this.maxAngle}°`,
        20,
        50
      );

      if (this.isWaitingForCannonball) {
        this.ctx.fillText(`Waiting for cannonball to settle...`, 20, 70);
      }
    }

    this.ctx.restore();
  }
}

export default FiringTableBuilder;
