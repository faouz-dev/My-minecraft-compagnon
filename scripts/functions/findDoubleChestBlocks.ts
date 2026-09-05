import { Block, BlockComponentTypes } from "@minecraft/server";
import { MinecraftBlockTypes, type ChestStates } from "@minecraft/vanilla-data";
import { Vector3Utils } from "@minecraft/math";

export function findDoubleChestBlocks(chest: Block): Block[] {
  const chestDirection = chest.permutation.getState<keyof ChestStates>("minecraft:cardinal_direction");
  const possiblePositions =
    chestDirection === "north" || chestDirection === "south"
      ? [
          { x: 1, z: 0 },
          { x: -1, z: 0 },
        ]
      : [
          { x: 0, z: 1 },
          { x: 0, z: -1 },
        ];

  const adjacentChestBlocks = possiblePositions
    .map((position) => chest.dimension.getBlock(Vector3Utils.add(chest.location, position)))
    .filter((block): block is Block => {
      if (!block || block.typeId !== MinecraftBlockTypes.Chest) return false;

      const inventory = block.getComponent(BlockComponentTypes.Inventory);
      return inventory?.container?.size === 54;
    });

  return [chest, ...adjacentChestBlocks];
}