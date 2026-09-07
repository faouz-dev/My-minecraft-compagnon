import { Block, Player } from "@minecraft/server";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";

export function lootAndBreakBlock(block: Block, player: Player): boolean {
  const { x, y, z } = block.location;
  const coordinates = `${x} ${y} ${z}`;

  try {
    player.runCommand(`loot spawn ${coordinates} mine ${coordinates} mainhand`);
    block.dimension.setBlockType(block.location, MinecraftBlockTypes.Air);
    return true;
  } catch {
    return false;
  }
}