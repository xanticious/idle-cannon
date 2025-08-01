// Firing Table Builder - Creates trajectory lookup tables for each world

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

  startBuilding() {
    console.log(
      `Starting firing table build for World ${this.worldManager.currentWorldId}`
    );
    console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);
    console.log(`Grid size: ${this.gridSize}, Total dots: ${this.dots.length}`);

    this.isBuilding = true;
    this.currentAngle = 0;
    this.firingTable = {};

    // Initialize firing table structure
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      this.firingTable[x] = {};
      for (let y = 0; y < this.canvas.height; y += this.gridSize) {
        this.firingTable[x][y] = [];
      }
    }

    console.log(`Initialized firing table structure`);
    this.testNextAngle();
  }

  testNextAngle() {
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
    this.cannon.fire([], true); // Force fire regardless of cooldown
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
        break;
      }
    }

    if (!this.currentCannonball) {
      console.warn(
        `No cannonball found after firing at angle ${this.currentAngle}`
      );
    }
  }

  update() {
    if (!this.isBuilding) return;

    if (this.isWaitingForCannonball && this.currentCannonball) {
      // Check if cannonball has come to rest or fallen off screen
      const isAtRest =
        Math.abs(this.currentCannonball.velocity.x) < 0.1 &&
        Math.abs(this.currentCannonball.velocity.y) < 0.1;
      const isOffScreen =
        this.currentCannonball.position.y > this.canvas.height + 100;
      const timeExpired =
        Date.now() - this.testFireStartTime > this.maxWaitTime;

      if (isAtRest || isOffScreen || timeExpired) {
        // Record the hit dots for this angle
        this.recordHitsForAngle();

        // Remove the cannonball
        this.physics.removeBody(this.currentCannonball);
        this.currentCannonball = null;
        this.isWaitingForCannonball = false;

        // Move to next angle
        this.currentAngle++;
        setTimeout(() => this.testNextAngle(), 100); // Small delay between tests
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

    // Copy to clipboard
    this.copyToClipboard(exportString);

    // Show completion message
    this.showCompletionMessage();
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
