import type { Vector3 } from "@minecraft/server";

export function roundDirection(direction: Vector3): Vector3 {
  return {
    x: Math.round(direction.x),
    y: Math.round(direction.y),
    z: Math.round(direction.z),
  };
}
