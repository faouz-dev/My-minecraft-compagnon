import { CompagnonManager } from "../class/CompagnonManager";
import { spawnSimulatedPlayer } from "@minecraft/server-gametest";
import { GameMode, Player, Vector3 } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";
import { COMPAGNON_TYPE } from "../constants/compagnonType";
import { CompagnonDBManager } from "../class/CompagnonDBManager";

export function createCompagnon(player: Player, location?: Vector3, name?: string): CompagnonManager {
  const spawnLocation = location ?? player.location;
  const compagnonName = name ?? CompagnonDBManager.getCompagnon(player)?.name ?? "Supremus Bot";
  const compagnon = spawnSimulatedPlayer(
    { dimension: player.dimension, ...spawnLocation },
    compagnonName,
    GameMode.Survival
  );
  compagnon.addTag(COMPAGNON_TYPE);

  const compagnonManager = new CompagnonManager(compagnon, player, compagnonName);
  COMPAGNONS.set(player.id, compagnonManager);
  return compagnonManager;
}
