import { CompagnonManager } from "../class/CompagnonManager";
import { spawnSimulatedPlayer } from "@minecraft/server-gametest";
import { GameMode, Player, Vector3 } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";
import { COMPAGNON_TYPE } from "../constants/compagnonType";

export function createCompagnon(player: Player, location?: Vector3): CompagnonManager {
  const spawnLocation = location ?? player.location;
  const compagnon = spawnSimulatedPlayer(
    { dimension: player.dimension, ...spawnLocation },
    "Supremus Bot",
    GameMode.Survival
  );
  compagnon.addTag(COMPAGNON_TYPE);

  const compagnonManager = new CompagnonManager(compagnon, player);
  COMPAGNONS.set(player.id, compagnonManager);
  return compagnonManager;
}
