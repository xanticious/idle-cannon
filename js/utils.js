// Utility Functions

// Generate gaussian random number using Box-Muller transformation
export function gaussianRandom(mean = 0, sigma = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * sigma + mean;
}

// Error function approximation for normal CDF
function erf(x) {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// Standard normal CDF
function normalCDF(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

// Inverse normal CDF approximation (Beasley-Springer-Moro algorithm)
function inverseNormalCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  let x;

  if (p < 0.02425) {
    // Lower tail
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
      ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
  } else if (p < 0.97575) {
    // Central region
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) *
        q) /
      (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
  } else {
    // Upper tail
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) /
      ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
  }

  return x;
}

// Sample from a truncated gaussian distribution
export function sampleGaussian(min, max, sigma, mu) {
  // If sigma is very small or 0, return the mean (clamped to range)
  if (sigma <= 0) {
    return Math.round(clamp(mu, min, max));
  }

  // If the range is very small, just return uniform random
  if (max - min < 1) {
    return min;
  }

  // Convert bounds to standard normal space
  const alpha = (min - mu) / sigma;
  const beta = (max - mu) / sigma;

  // Get CDF values at the bounds
  const phiAlpha = normalCDF(alpha);
  const phiBeta = normalCDF(beta);

  // If the probability mass in the range is too small, fall back to uniform
  if (phiBeta - phiAlpha < 1e-10) {
    return randomInt(min, max);
  }

  // Sample uniformly from [Φ(α), Φ(β)]
  const u = Math.random() * (phiBeta - phiAlpha) + phiAlpha;

  // Convert back to original space using inverse CDF
  const z = inverseNormalCDF(u);
  const sample = mu + sigma * z;

  // Clamp to ensure we're within bounds (numerical precision safety)
  return Math.round(clamp(sample, min, max));
}

// Format large numbers with suffixes (k, m, b, t)
export function formatNumber(num) {
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
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

// Clamp value between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Distance between two points
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Random integer between min and max (inclusive)
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Angle between two points
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Convert degrees to radians
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Convert radians to degrees
export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// Simple collision detection for circles
export function circleCollision(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) < r1 + r2;
}

// Get random element from array
export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Simple easing functions
export const Easing = {
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOut: (t) => t * (2 - t),
  easeIn: (t) => t * t,
};

// Color utilities
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Performance utilities
export class PerformanceMonitor {
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
export class ObjectPool {
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
