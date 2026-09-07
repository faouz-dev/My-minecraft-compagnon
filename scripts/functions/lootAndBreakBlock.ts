import { Block } from "@minecraft/server";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";

export function lootAndBreakBlock(block: Block): boolean {
  const { x, y, z } = block.location;
  const coordinates = `${x} ${y} ${z}`;

  try {
    block.dimension.runCommand(`loot spawn ${coordinates} mine ${coordinates}`);
    block.dimension.setBlockType(block.location, MinecraftBlockTypes.Air);
    return true;
  } catch {
    return false;
  }
}