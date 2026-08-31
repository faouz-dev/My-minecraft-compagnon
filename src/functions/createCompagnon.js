import { CompagnonManager } from "../class/CompagnonManager";
import { spawnSimulatedPlayer } from "@minecraft/server-gametest";
import { GameMode, Player } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";

/**
 *
 * @param {Player} player
 * @returns
 */
export function createCompagnon(player) {
  const compagnon = spawnSimulatedPlayer(
    { dimension: player.dimension, ...player.location },
    player.nameTag + "'s Compagnon",
    GameMode.Survival,
  );
  compagnon.addTag("faouzdev:compagnon");

  const compagnonManager = new CompagnonManager(compagnon, player);
  COMPAGNONS.set(player.id, compagnonManager);
  return compagnonManager;
}
