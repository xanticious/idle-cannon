// Trajectory calculation utilities for ballistic projectiles

// Import firing table data for each world
const firingTableModules = {
  1: () => import('../data/firing-table/world-1.js'),
  2: () => import('../data/firing-table/world-2.js'),
  3: () => import('../data/firing-table/world-3.js'),
  4: () => import('../data/firing-table/world-4.js'),
  5: () => import('../data/firing-table/world-5.js'),
  6: () => import('../data/firing-table/world-6.js'),
  7: () => import('../data/firing-table/world-7.js'),
  8: () => import('../data/firing-table/world-8.js'),
  9: () => import('../data/firing-table/world-9.js'),
  10: () => import('../data/firing-table/world-10.js'),
  11: () => import('../data/firing-table/world-11.js'),
};

// Cache for loaded firing tables
const firingTableCache = new Map();

/**
 * Load firing table data for a specific world
 * @param {number} worldId - The world ID
 * @returns {Promise<Object>} - The firing table data
 */
async function loadFiringTable(worldId) {
  if (firingTableCache.has(worldId)) {
    return firingTableCache.get(worldId);
  }

  if (!firingTableModules[worldId]) {
    console.warn(`No firing table available for world ${worldId}`);
    return null;
  }

  try {
    const module = await firingTableModules[worldId]();
    const firingTable = module.default;
    firingTableCache.set(worldId, firingTable);
    return firingTable;
  } catch (error) {
    console.error(`Failed to load firing table for world ${worldId}:`, error);
    return null;
  }
}

/**
 * Calculate the launch angle(s) needed to hit a target with a projectile.
 * Uses pre-calculated firing table data for accuracy.
 *
 * @param {Object} params - The calculation parameters
 * @param {number} params.targetX - Target X position in pixels
 * @param {number} params.targetY - Target Y position in pixels
 * @param {Object} params.world - The current world object with id property
 * @returns {Promise<null|number[]>} - null if unreachable, array of angles in degrees (converted to radians)
 */
export async function calculateLaunchAngles({ targetX, targetY, world }) {
  const firingTable = await loadFiringTable(world.id);

  if (!firingTable) {
    return null;
  }

  // Round coordinates to nearest 10 pixels for lookup (firing table resolution)
  const roundedX = Math.round(targetX / 10) * 10;
  const roundedY = Math.round(targetY / 10) * 10;

  // Look up angles in the firing table
  const xData = firingTable[roundedX];
  if (!xData) {
    return null;
  }

  const angles = xData[roundedY];
  if (!angles || angles.length === 0) {
    return null;
  }

  // Convert angles from degrees to radians
  return angles.map((angleDegrees) => (angleDegrees * Math.PI) / 180);
}
