// Utility Functions

// Generate gaussian random number using Box-Muller transformation
function gaussianRandom(mean = 0, sigma = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * sigma + mean;
}

// Format large numbers with suffixes (k, m, b, t)
function formatNumber(num) {
  const suffixes = ["", "k", "m", "b", "t", "q"];
  let suffixIndex = 0;

  while (num >= 1000 && suffixIndex < suffixes.length - 1) {
    num /= 1000;
    suffixIndex++;
  }

  if (suffixIndex === 0) {
    return Math.floor(num).toString();
  }

  return `${num.toFixed(num < 10 ? 1 : 0)}${suffixes[suffixIndex]}`;
}

// Linear interpolation
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// Clamp value between min and max
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Distance between two points
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Angle between two points
function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Convert degrees to radians
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Convert radians to degrees
function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// Simple collision detection for circles
function circleCollision(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) < r1 + r2;
}

// Get random element from array
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Simple easing functions
const Easing = {
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOut: (t) => t * (2 - t),
  easeIn: (t) => t * t,
};

// Color utilities
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Performance utilities
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 60;
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();

    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastTime)
      );
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  getFPS() {
    return this.fps;
  }
}

// Object pool for performance optimization
class ObjectPool {
  constructor(createFn, resetFn) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.used = [];
  }

  get() {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.createFn();
    }
    this.used.push(obj);
    return obj;
  }

  release(obj) {
    const index = this.used.indexOf(obj);
    if (index > -1) {
      this.used.splice(index, 1);
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.used.length > 0) {
      this.release(this.used[0]);
    }
  }
}
