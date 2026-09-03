import type {
  Block,
  CustomComponentParameters,
  Entity,
  ItemComponentUseEvent,
  ItemComponentUseOnEvent,
  ItemCustomComponent,
  Player,
} from "@minecraft/server";
import { COMPAGNON_TYPE } from "../constants/compagnonType";
import { Vector3Utils } from "@minecraft/math";
import { COMPAGNONS } from "../constants";
import { debugLog } from "../functions";

export class CompagnonGuiderCustomComponent implements ItemCustomComponent {
  constructor() {
    this.onUse = this.onUse.bind(this);
  }

  getCompagnonsOrPreventIfDontHave(player: Player) {
    const haveCompagnon = COMPAGNONS.get(player.id);
    if (!haveCompagnon) {
      player.sendMessage({ translate: "message.cpn_guider.dont_have_compagnon" });
      return false;
    }
    return haveCompagnon;
  }

  onUse(event: ItemComponentUseEvent, param: CustomComponentParameters) {
    const { source } = event;

    const useOnEntity = source.getEntitiesFromViewDirection({
      tags: [COMPAGNON_TYPE],
      maxDistance: 5,
    });

    const useOnBlock = source.getBlockFromViewDirection({ maxDistance: 5 });

    let usedOn: "block" | "entity" | undefined;
    const entityDistance = useOnEntity.length > 0 ? useOnEntity[0].distance : undefined;
    const blockDistance = useOnBlock ? Vector3Utils.distance(useOnBlock.block.location, source.location) : undefined;

    if (entityDistance && ((blockDistance && entityDistance < blockDistance) || !blockDistance)) {
      usedOn = "entity";
    } else if (blockDistance) {
      usedOn = "block";
    }

    switch (usedOn) {
      case "entity":
        const entity = useOnEntity[0].entity;
        // TODO: Use on entity
        debugLog("[CompagnonGuiderCustomComponent] Using on an entity : " + entity.id);
        const haveCompagnon = this.getCompagnonsOrPreventIfDontHave(source);
        if (haveCompagnon) {
          const compagnon = haveCompagnon;
          const isHisCompagnon = entity.id === compagnon.compagnon.id;
          if (!isHisCompagnon) {
            debugLog("[CompagnonGuiderCustomComponent] Not his compagnon");
            return source.sendMessage({ translate: "message.cpm_guider.only_use_on_own_compagnon" });
          }
          debugLog("[CompagnonGuiderCustomComponent] Using on his compagnon");
        }
        break;
      case "block":
        // TODO: Use on block
        const block = useOnBlock!.block;
        debugLog("[CompagnonGuiderCustomComponent] Using on a block : " + block.typeId);
        break;
      default:
        debugLog("[CompagnonGuiderCustomComponent] No target");
        break;
    }
  }
}
