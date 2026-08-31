import { EntityComponentTypes, system, System, world } from "@minecraft/server";
import { COMPAGNONS } from "../constants/Compagnons";
import { debugLog } from "../functions/debugLog";
import { CompagnonDBManager } from "../class/CompagnonDBManager";

world.afterEvents.entityDie.subscribe((event) => {
  const { deadEntity } = event;

  if (deadEntity.hasTag("faouzdev:compagnon")) {
    debugLog(`Compagnon ${deadEntity.id} is dead`);
    const compagnon = Array.from(COMPAGNONS.values()).find(
      (c) => c.compagnon.id === deadEntity.id,
    );

    if (compagnon) {
      COMPAGNONS.delete(compagnon.owner.id);
      CompagnonDBManager.removeCompagnonData(compagnon.owner);
    }
  }
});

world.afterEvents.entityHitEntity.subscribe((event) => {
  const { damagingEntity, hitEntity } = event;

  if (
    damagingEntity
      .getComponent(EntityComponentTypes.TypeFamily)
      ?.hasTypeFamily("player")
  ) {
    debugLog("Player hit entity");
    const playerCompagnon = COMPAGNONS.get(damagingEntity.id);
    if (playerCompagnon && playerCompagnon.compagnon.id !== hitEntity.id) {
      debugLog("Player has compagnon");
      playerCompagnon.setOwnerEntityTarget(hitEntity);
    }
  }
});
