import { EntityComponentTypes, EntityInventoryComponent, Player } from "@minecraft/server";

const PLANTABLE_SEEDS = new Set([
  "minecraft:wheat_seeds",
  "minecraft:beetroot_seeds",
  "minecraft:carrot",
  "minecraft:potato",
  "minecraft:pumpkin_seeds",
  "minecraft:melon_seeds",
  "minecraft:torchflower_seeds",
  "minecraft:pitcher_pod",
  "minecraft:cocoa_beans",
]);

export function findSeedInInventory(container: EntityInventoryComponent) {
  const inventory = container;

  for (let slot = 0; slot < inventory.container.size; slot++) {
    const item = inventory.container.getItem(slot);

    if (item && PLANTABLE_SEEDS.has(item.typeId)) {
      return {
        item,
        slot,
      };
    }
  }

  return undefined;
}
