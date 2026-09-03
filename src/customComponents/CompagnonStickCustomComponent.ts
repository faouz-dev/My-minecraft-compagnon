import type {
  Block,
  CustomComponentParameters,
  Entity,
  ItemComponentUseEvent,
  ItemComponentUseOnEvent,
  ItemCustomComponent,
} from "@minecraft/server";
import { COMPAGNON_TYPE } from "../constants/compagnonType";
import { Vector3Utils } from "@minecraft/math";

export class CompagnonStickCustomComponent implements ItemCustomComponent {
  constructor() {
    this.onUse = this.onUse.bind(this);
  }

  onUse(event: ItemComponentUseEvent, param: CustomComponentParameters) {
    const { source } = event;

    const useOnEntity = source.getEntitiesFromViewDirection({
      type: COMPAGNON_TYPE,
      maxDistance: 5,
    });

    const useOnBlock = source.getBlockFromViewDirection({ maxDistance: 5 });

    let usedOn: "block" | "entity" | undefined;
    const entityDistance =
      useOnEntity.length > 0 ? useOnEntity[0].distance : undefined;
    const blockDistance = useOnBlock
      ? Vector3Utils.distance(useOnBlock.block.location, source.location)
      : undefined;

    if (
      (entityDistance && blockDistance && entityDistance < blockDistance) ||
      !blockDistance
    ) {
      usedOn = "entity";
    } else if (blockDistance) {
      usedOn = "block";
    }

    switch (usedOn) {
      case "entity":
        // TODO: Use on entity
        source.sendMessage("Use on entity");
        break;
      case "block":
        // TODO: Use on block
        source.sendMessage("Use on block");
        break;
      default:
        break;
    }
  }
}
