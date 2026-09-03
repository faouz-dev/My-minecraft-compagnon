import { CompagnonManager } from "../class/CompagnonManager";
import { spawnSimulatedPlayer } from "@minecraft/server-gametest";
import { GameMode, Player } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";
import { COMPAGNON_TYPE } from "../constants/compagnonType";

export function createCompagnon(player: Player) {
  const compagnon = spawnSimulatedPlayer(
    { dimension: player.dimension, ...player.location },
    player.nameTag + "'s Compagnon",
    GameMode.Survival,
  );
  compagnon.addTag(COMPAGNON_TYPE);

  const compagnonManager = new CompagnonManager(compagnon, player);
  COMPAGNONS.set(player.id, compagnonManager);
  return compagnonManager;
}
