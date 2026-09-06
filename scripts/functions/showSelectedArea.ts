import { Dimension, Vector3, system } from "@minecraft/server";

export function showSelectedArea(p1: Vector3, p2: Vector3, durationTicks = 20, dimension: Dimension): void {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);

  const minZ = Math.min(p1.z, p2.z);
  const maxZ = Math.max(p1.z, p2.z);

  const y = p1.y + 1.25;

  const outline: Vector3[] = [];

  // Haut + bas du rectangle
  for (let x = minX; x <= maxX; x++) {
    outline.push({
      x: x + 0.5,
      y,
      z: minZ + 0.5,
    });

    if (maxZ !== minZ) {
      outline.push({
        x: x + 0.5,
        y,
        z: maxZ + 0.5,
      });
    }
  }

  // Gauche + droite
  // On évite les coins car ils sont déjà ajoutés au-dessus.
  for (let z = minZ + 1; z < maxZ; z++) {
    outline.push({
      x: minX + 0.5,
      y,
      z: z + 0.5,
    });

    if (maxX !== minX) {
      outline.push({
        x: maxX + 0.5,
        y,
        z: z + 0.5,
      });
    }
  }

  const interval = system.runInterval(() => {
    for (const position of outline) {
      dimension.spawnParticle("minecraft:endrod", position);
    }
  }, 5);

  system.runTimeout(() => {
    system.clearRun(interval);
  }, durationTicks);
}
