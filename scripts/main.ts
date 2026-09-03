import { EntityComponentTypes, system, world } from "@minecraft/server";
import { COMPAGNONS } from "./constants/Compagnons";
import { MinecraftItemTypes } from "@minecraft/vanilla-data";

// Init commands
import "./commands/index";
console.log("commands initialised");

// Init events
import "./events/index";
import { createCompagnon } from "./functions/createCompagnon";
import { isDebug } from "./constants/isDebug";
import { debugLog } from "./functions/debugLog";
import { CompagnonDBManager } from "./class/CompagnonDBManager";
console.log("events initialised");

system.runInterval(() => {
  // Compagnons behavior
  for (const compagnon of COMPAGNONS.values()) {
    if (compagnon.compagnon.isValid) {
      compagnon.compagnonBehavior();
    }
  }
}, 1);

// ======================================================
//                DEBUG UTILITES
// =====================================================

function devUtilities() {
  world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
    if (itemStack.typeId !== MinecraftItemTypes.NetheriteShovel) return;
    const compagnon = createCompagnon(source);
    CompagnonDBManager.createCompagnonData(source, compagnon.compagnon);
  });

  system.runTimeout(() => {
    debugLog("Loading Compagnon datas");
    const players = world.getPlayers({
      tags: ["faouzdev:compagnon"],
    });
    // Remove all comapgnons
    for (const player of players) {
      player.remove();
    }

    for (const { compagnon, player } of CompagnonDBManager.getAllForExistingPlayer()) {
      const compagnonManager = createCompagnon(player);
      compagnonManager.compagnon.getComponent(EntityComponentTypes.Health)?.setCurrentValue(compagnon.health);
      compagnonManager.updateBehavior(compagnon.forced_behavior);
    }
  }, 20 * 5);
}

dev: devUtilities();
dev: console.log("successfully started");