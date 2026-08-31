/**
 * Retourne un point aléatoire autour d'une position.
 *
 * @param {import("@minecraft/server").Vector3} center
 * @param {number} minDistance
 * @param {number} maxDistance
 * @returns {import("@minecraft/server").Vector3}
 */
export function getRandomPointAround(
  center,
  minDistance = 3,
  maxDistance = 10,
) {
  const angle = Math.random() * Math.PI * 2;

  const distance = minDistance + Math.random() * (maxDistance - minDistance);

  return {
    x: center.x + Math.cos(angle) * distance,
    y: center.y,
    z: center.z + Math.sin(angle) * distance,
  };
}
