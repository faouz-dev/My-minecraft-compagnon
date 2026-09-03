import { BlockVolume, type Vector3 } from "@minecraft/server";

export function createCube(center: Vector3, distance: number): BlockVolume {
  return new BlockVolume(
    {
      x: center.x - distance,
      y: center.y - distance,
      z: center.z - distance,
    },
    {
      x: center.x + distance,
      y: center.y + distance,
      z: center.z + distance,
    },
  );
}
