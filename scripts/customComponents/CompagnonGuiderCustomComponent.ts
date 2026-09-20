import {
  system,
  type CustomComponentParameters,
  type ItemComponentUseEvent,
  type ItemComponentUseOnEvent,
  type ItemCustomComponent,
  type Player,
} from "@minecraft/server";
import { COMPAGNON_TYPE } from "../constants/compagnonType";
import { COMPAGNONS } from "../constants";
import { debugLog } from "../functions";
import { UIMenuCommandsManager } from "../class/UIMenuCommandsManager";

export class CompagnonGuiderCustomComponent implements ItemCustomComponent {
  /**
   * Stores the tick on which the staff was used directly on a block.
   * `onUse` can also fire for the same interaction, so entity handling is
   * deferred by one tick and ignored when a block interaction was recorded.
   */
  private readonly lastBlockUseTick = new Map<string, number>();

  constructor() {
    this.onUse = this.onUse.bind(this);
    this.onUseOn = this.onUseOn.bind(this);
  }

  getCompagnonsOrPreventIfDontHave(player: Player) {
    const haveCompagnon = COMPAGNONS.get(player.id);
    if (!haveCompagnon) {
      player.sendMessage({ translate: "message.mycompagnon:staff_of_authority.dont_have_compagnon" });
      return false;
    }
    return haveCompagnon;
  }

  onUse(event: ItemComponentUseEvent, _param: CustomComponentParameters) {
    const { source } = event;
    const useTick = system.currentTick;

    // Delay entity handling by one tick. If the same use was actually made on
    // a block, onUseOn records it first and this callback safely does nothing.
    system.run(() => {
      const lastBlockTick = this.lastBlockUseTick.get(source.id);
      if (lastBlockTick !== undefined && lastBlockTick >= useTick) {
        return;
      }

      const useOnEntity = source.getEntitiesFromViewDirection({
        tags: [COMPAGNON_TYPE],
        maxDistance: 5,
      });

      if (useOnEntity.length === 0) {
        debugLog("[CompagnonGuiderCustomComponent] No entity target");
        return;
      }

      const entity = useOnEntity[0].entity;
      debugLog("[CompagnonGuiderCustomComponent] Using on an entity : " + entity.id);

      const compagnonbehavior = this.getCompagnonsOrPreventIfDontHave(source);
      if (!compagnonbehavior) return;

      const compagnon = compagnonbehavior;
      const isHisCompagnon = entity.id === compagnon.compagnon.id;

      if (!isHisCompagnon) {
        debugLog("[CompagnonGuiderCustomComponent] Not his compagnon");
        source.sendMessage({
          translate: "message.mycompagnon:staff_of_authority.only_use_on_own_compagnon",
        });
        return;
      }

      debugLog("[CompagnonGuiderCustomComponent] Using on his compagnon");
      UIMenuCommandsManager.openMenu(source, compagnon);
    });
  }

  onUseOn(event: ItemComponentUseOnEvent) {
    const { source, block } = event;

    // Important: event.block is the exact block that received the item use.
    // This avoids the old view-direction raycast selecting the block below or
    // behind a non-full block such as a chest.
    this.lastBlockUseTick.set(source.id, system.currentTick);

    debugLog("[CompagnonGuiderCustomComponent] Using directly on block : " + block.typeId);

    const existCompagnon = this.getCompagnonsOrPreventIfDontHave(source);
    if (!existCompagnon) return;

    if (existCompagnon.isSelectingFarmArea(block)) return;
    if (existCompagnon.startClearInventory(block)) return;
  }
}
