import { BlockInventoryComponent, EntityComponentTypes, EntityInventoryComponent, Player } from "@minecraft/server";

export const PLANTABLE_SEEDS = new Set([
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

// Map liant directement le blockId à son état de croissance maximum
export const PLANT_MAX_GROWTH = new Map([
  ["minecraft:wheat", 7],
  ["minecraft:beetroot", 7],
  ["minecraft:carrots", 7],
  ["minecraft:potatoes", 7],
  ["minecraft:pumpkin_stem", 7],
  ["minecraft:melon_stem", 7],
  ["minecraft:torchflower_crop", 2],
  ["minecraft:pitcher_crop", 4],
  ["minecraft:cocoa", 2],
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

export function findSeedInChest(container: BlockInventoryComponent) {
  const inventory = container;

  for (let slot = 0; slot < inventory.container!.size; slot++) {
    const item = inventory.container!.getItem(slot);

    if (item && PLANTABLE_SEEDS.has(item.typeId)) {
      return {
        item,
        slot,
      };
    }
  }
}
