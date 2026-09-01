import type { Dimension, Vector3 } from "@minecraft/server";

export function safestDirectionFromMob(
  mobPosition: Vector3,
  companionPosition: Vector3,
  dimension: Dimension,
): Vector3 | null {
  const directions: Vector3[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },

    { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 },
    { x: -Math.SQRT1_2, y: 0, z: Math.SQRT1_2 },
    { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 },
    { x: -Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 },
  ];

  let bestDirection: Vector3 | null = null;
  let bestScore = -Infinity;

  for (const direction of directions) {
    const score = evaluateDirection(
      direction,
      companionPosition,
      mobPosition,
      dimension,
    );

    if (score !== null && score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function evaluateDirection(
  direction: Vector3,
  companionPosition: Vector3,
  mobPosition: Vector3,
  dimension: Dimension,
): number | null {
  const distance = 5;

  let score = 0;

  const baseY = Math.floor(companionPosition.y);

  for (let i = 1; i <= distance; i++) {
    const x = Math.floor(companionPosition.x + direction.x * i);

    const z = Math.floor(companionPosition.z + direction.z * i);

    let y = baseY;

    const feet = dimension.getBlock({
      x,
      y,
      z,
    });

    const head = dimension.getBlock({
      x,
      y: y + 1,
      z,
    });

    const ground = dimension.getBlock({
      x,
      y: y - 1,
      z,
    });

    if (!feet || !head || !ground) {
      return null;
    }

    /*
     * ---------------------------------------------
     * CASE 1 : espace totalement libre
     * ---------------------------------------------
     */

    if (feet.isAir && head.isAir) {
      // Il y a du sol
      if (!ground.isAir) {
        score += 10;
        continue;
      }

      // Trou → très mauvais
      score -= 100;
      continue;
    }

    /*
     * ---------------------------------------------
     * CASE 2 : un bloc devant les pieds
     *
     * Le compagnon peut potentiellement sauter
     * par-dessus.
     * ---------------------------------------------
     */

    if (!feet.isAir && head.isAir) {
      const blockAbove = dimension.getBlock({
        x,
        y: y + 2,
        z,
      });

      // Un seul bloc de hauteur → jump possible
      if (blockAbove?.isAir) {
        score += 3;
        continue;
      }

      // Deux blocs ou plus → mur
      return null;
    }

    /*
     * ---------------------------------------------
     * CASE 3 : bloc au niveau des pieds ET de la tête
     * ---------------------------------------------
     */

    if (!feet.isAir && !head.isAir) {
      return null;
    }
  }

  /*
   * ---------------------------------------------
   * Distance par rapport au mob
   * ---------------------------------------------
   */

  const targetX = companionPosition.x + direction.x * distance;

  const targetZ = companionPosition.z + direction.z * distance;

  const dx = targetX - mobPosition.x;
  const dz = targetZ - mobPosition.z;

  const distanceFromMob = Math.sqrt(dx * dx + dz * dz);

  score += distanceFromMob * 10;

  /*
   * ---------------------------------------------
   * Direction opposée au mob
   * ---------------------------------------------
   */

  const mobDx = companionPosition.x - mobPosition.x;

  const mobDz = companionPosition.z - mobPosition.z;

  const mobDistance = Math.sqrt(mobDx * mobDx + mobDz * mobDz);

  if (mobDistance > 0) {
    const awayX = mobDx / mobDistance;
    const awayZ = mobDz / mobDistance;

    const dot = direction.x * awayX + direction.z * awayZ;

    score += dot * 50;
  }

  return score;
}
