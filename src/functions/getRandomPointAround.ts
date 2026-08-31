import type { Vector3 } from "@minecraft/server";

/**
 * Retourne un point aléatoire autour d'une position.
 *
 */
export function getRandomPointAround(
  center: Vector3,
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
