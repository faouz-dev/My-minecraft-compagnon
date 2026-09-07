import { EntityComponentTypes, world } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";
import { CompagnonDBManager } from "../class/CompagnonDBManager";
import { createCompagnon } from "../functions/createCompagnon";
import { debugLog } from "../functions/debugLog";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import { COMPAGNON_TYPE } from "../constants/compagnonType";

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  // Spawn Player's Bot
  const compagnonData = CompagnonDBManager.getCompagnon(player);
  if (compagnonData) {
    const compagnonManager = createCompagnon(player);
    compagnonManager.compagnon.getComponent(EntityComponentTypes.Health)?.setCurrentValue(compagnonData.health);
    compagnonManager.updateBehavior(compagnonData.forced_behavior);
  }
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  // Despawn Player's Bot
  const compagnon = COMPAGNONS.get(playerId);
  if (compagnon) {
    compagnon.savePersistentData();
    COMPAGNONS.delete(playerId);
    compagnon.compagnon.remove();
  }
});

world.afterEvents.playerInventoryItemChange.subscribe((event) => {
  const { player } = event;
  // trigger compagnon update event
  if (player.hasTag(COMPAGNON_TYPE)) {
    const compagnon = Array.from(COMPAGNONS.values()).find((c) => c.compagnon.id === player.id);
    if (compagnon) {
      compagnon.onInventoryUpdate();
    }
  }
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
  if (event.block.typeId === MinecraftBlockTypes.CarvedPumpkin) {
    const blockPosition = event.block.location;
    const dimension = event.block.dimension;

    const diamondPositions = [
      { x: 0, y: -1, z: 0 },
      { x: 0, y: -2, z: 0 },
    ];

    const blocks = [event.block];

    const isSpawningCompagnon = diamondPositions.every(({ x, y, z }) => {
      const targetBlock = dimension.getBlock({
        x: blockPosition.x + x,
        y: blockPosition.y + y,
        z: blockPosition.z + z,
      });

      if (targetBlock) blocks.push(targetBlock);
      return targetBlock?.typeId === MinecraftBlockTypes.DiamondBlock;
    });

    if (isSpawningCompagnon) {
      if (CompagnonDBManager.hasCompagnon(event.player)) {
        event.player.sendMessage({ translate: "message.mycompagnon:compagnon.already_have_compagnon" });
      } else {
        blocks.forEach((b) => event.player.dimension.setBlockType(b.location, MinecraftBlockTypes.Air));
        const comapgnon = createCompagnon(event.player, blockPosition);
        CompagnonDBManager.createCompagnonData(event.player, comapgnon.compagnon);
      }
    } else {
      debugLog("Pumpkin placed but not a diamond golem");
    }
  }
});
