import {
  Player,
  world,
  Entity,
  EntityComponentTypes,
  EntityTypeFamilyComponent,
  EntityInventoryComponent,
  EntityEquippableComponent,
  EquipmentSlot,
  ItemStack,
  System,
  EntityType,
  EntityTypes,
} from "@minecraft/server";
import { getPlayerSkin, SimulatedPlayer } from "@minecraft/server-gametest";
import { Vector2Utils, Vector3Utils } from "@minecraft/math";
import { debugLog } from "../functions/debugLog";
import { CompagnonDBManager } from "./CompagnonDBManager";
import { checkforBestItem } from "../functions/checkforBestItem";
import { FOOD_MOBS } from "../constants/foodMobs";
import { getRandomPointAround } from "../functions/getRandomPointAround";

/**
 * @typedef {"default"| "follow_player" | "kill_mobs_for_food" | "farm_in_champs"} ForcedBehavior
 */

export class CompagnonManager {
  // #region Variable Declaration

  // compagnon configuration properties
  /**
   * @type {Player}
   */
  #owner;

  /**
   * @type {SimulatedPlayer}
   */
  #compagnon;

  /**
   * @type {string|null}
   */
  #behavior = null;

  /**
   * @type {ForcedBehavior}
   */
  #forced_behavior = "default";

  // targetting properties
  /**
   * @type {Entity|null}
   */
  #target_entity = null;

  /**
   * @type {Entity|null}
   */
  #target_item = null;

  /**
   * @type {Entity|null}
   */
  #ownerEntityTarget = null;

  /**
   * @type {import("@minecraft/server").Vector3|null}
   */
  #target_location = null;

  /**
   * @type {boolean}
   */
  #shouldSleep = false;

  // Datas properties

  /**
   * @type {{lastPosition : import("@minecraft/server").Vector3, lastPositionTime : number}}
   */

  // @ts-ignore
  #mouvement_datas = null;

  /**
   * @type {{checkpoint : import("@minecraft/server").Vector3|null, action: string|null}}
   */
  #farming_behavior_datas = { checkpoint: null, action: null };

  /**
   *
   * @param {SimulatedPlayer} compagnon
   * @param {Player} owner
   */

  // #endregion

  constructor(compagnon, owner) {
    this.#compagnon = compagnon;
    this.#owner = owner;

    this.#config();
  }

  get compagnon() {
    return this.#compagnon;
  }

  get forced_behavior() {
    return this.#forced_behavior;
  }

  get owner() {
    return this.#owner;
  }

  #config() {
    // Set Skin
    const playerSkin = getPlayerSkin(this.#owner);
    this.#compagnon.setSkin(playerSkin);
    debugLog(`[Config] - Compagnon skin set`);

    // Initialise Values
    this.#mouvement_datas = {
      lastPosition: this.#compagnon.location,
      lastPositionTime: 0,
    };
  }

  #recurentsCheck() {
    if (this.#owner.isSleeping) {
      this.#shouldSleep = true;
    } else {
      this.#shouldSleep = false;
    }
  }

  /**
   *
   * @param {import("@minecraft/server").Vector3} a
   * @param {import("@minecraft/server").Vector3} b
   */
  #nearestFromCompagnon(a, b) {
    return (
      Vector3Utils.distance(a, this.#compagnon.location) -
      Vector3Utils.distance(b, this.#compagnon.location)
    );
  }

  /**
   * @param {ForcedBehavior} behavior
   */
  updateBehavior(behavior) {
    this.#forced_behavior = behavior;
    CompagnonDBManager.updateCompagnonData(this.#owner, {
      forced_behavior: behavior,
    });
    debugLog(`Compagnon behavior updated to ${behavior}`);
  }

  /**
   * @param {ForcedBehavior[]} behaviors
   * @returns
   */
  #hasForcedBehavior(behaviors) {
    return behaviors.includes(this.#forced_behavior);
  }

  /**
   *
   * @returns {EntityInventoryComponent}
   */
  #getInventoryComponent() {
    // @ts-ignore
    return this.#compagnon.getComponent(EntityComponentTypes.Inventory);
  }

  /**
   *
   * @returns {EntityEquippableComponent}
   */
  #getEquipableComponent() {
    // @ts-ignore
    return this.#compagnon.getComponent(EntityComponentTypes.Equippable);
  }

  /**
   * @description - Update the armor set behavior
   */
  #armorUpdater() {
    const equipableComponent = this.#getEquipableComponent();
    const inventoryComponent = this.#getInventoryComponent();

    // Case Head
    for (const armorSlot of [
      EquipmentSlot.Head,
      EquipmentSlot.Chest,
      EquipmentSlot.Legs,
      EquipmentSlot.Feet,
    ]) {
      const hasArmorOnSlot = equipableComponent.getEquipment(armorSlot);
      const bestArmorForSlot = checkforBestItem(
        hasArmorOnSlot,
        inventoryComponent.container,
        armorSlot,
      );
      if (bestArmorForSlot.shouldChange) {
        debugLog(
          `[ArmorUpdater] - Compagnon should change helmet : ${bestArmorForSlot.bestItem?.type}`,
        );
        try {
          equipableComponent.setEquipment(
            armorSlot,
            bestArmorForSlot.bestItem?.clone(),
          );
          // @ts-ignore
          inventoryComponent.container.setItem(bestArmorForSlot.index);
          debugLog("[ArmorUpdater] - Compagnon armor set on slot " + armorSlot);
        } catch (error) {
          debugLog(
            `[ArmorUpdater] - Error on setting compagnon armor :` + error,
          );
        }
      }
    }
  }

  /**
   * @description - Update the offhand tool behavior
   */
  #offHandUpdater() {
    const equipableComponent = this.#getEquipableComponent();
    const inventoryComponent = this.#getInventoryComponent();

    const hasOffhandTool = equipableComponent.getEquipment(
      EquipmentSlot.Offhand,
    );
    const bestOffhandTool = checkforBestItem(
      hasOffhandTool,
      inventoryComponent.container,
      EquipmentSlot.Offhand,
    );
    if (bestOffhandTool.shouldChange && bestOffhandTool.index !== undefined) {
      debugLog(
        `[OffHandUpdater] - Compagnon should change offhand tool : ${bestOffhandTool.bestItem?.type}`,
      );
      try {
        equipableComponent.setEquipment(
          EquipmentSlot.Offhand,
          bestOffhandTool.bestItem?.clone(),
        );
        inventoryComponent.container.setItem(bestOffhandTool.index);
        debugLog(
          "[OffHandUpdater] - Compagnon offhand tool set on slot " +
            EquipmentSlot.Offhand,
        );
      } catch (error) {
        debugLog(
          `[OffHandUpdater] - Error on setting compagnon offhand tool :` +
            error,
        );
      }
    }
  }

  #UtilsItemsOrganiser() {
    const inventoryComponent = this.#getInventoryComponent();
    const equipableComponent = this.#getEquipableComponent();

    /**
     * @type {import("../functions/checkforBestItem").ItemPurpose[]}
     */
    const hotbarConfiguration = ["combat", "woodcutting", "mining"];
    for (let i = 0; i < 3; i++) {
      const currentItem = inventoryComponent.container.getItem(i);
      const bestItem = checkforBestItem(
        currentItem,
        inventoryComponent.container,
        EquipmentSlot.Mainhand,
        hotbarConfiguration[i],
      );

      if (bestItem.shouldChange && bestItem.index !== undefined) {
        inventoryComponent.container.swapItems(
          i,
          bestItem.index,
          inventoryComponent.container,
        );
        debugLog("[UtilsItemsOrganiser] - Compagnon item set on slot ");
      }
    }
  }

  onInventoryUpdate() {
    debugLog(
      "[InventoryUpdate] - Compagnon inventory update triggered for " +
        this.#compagnon.name,
    );

    //  Offhand - Updater
    this.#offHandUpdater();

    // HotBar Configuration
    this.#UtilsItemsOrganiser();

    //Armor Set Updater
    this.#armorUpdater();
  }

  /**
   * @param {{ type: "entity" | "location", entity?: Entity, location?: import("@minecraft/server").Vector3 } | Entity | import("@minecraft/server").Vector3} target
   */
  #move(target) {
    const targetData =
      target && typeof target === "object" && "type" in target
        ? target
        : target && typeof target === "object" && "location" in target
          ? { type: "entity", entity: target }
          : { type: "location", location: target };

    const targetEntity =
      targetData.type === "entity" ? targetData.entity : null;
    const targetLocation =
      targetData.type === "location"
        ? targetData.location
        : targetEntity
          ? targetEntity.location
          : null;

    if (!targetLocation) {
      debugLog("[move] - Compagnon has no target location");
      return;
    }

    const currentPosition = this.#compagnon.location;
    const distanceMoved = Vector3Utils.distance(
      currentPosition,
      this.#mouvement_datas.lastPosition,
    );
    const beingStuckSince = this.#mouvement_datas.lastPositionTime;

    if (Vector3Utils.distance(currentPosition, targetLocation) < 0.8) {
      this.#mouvement_datas.lastPositionTime =
        (this.#mouvement_datas.lastPositionTime ?? 0) + 1;
      if (beingStuckSince > 5) {
        debugLog("[move] - Compagnon is stuck applying impluse");
        const direction = Vector3Utils.normalize(
          Vector3Utils.add(
            targetLocation,
            Vector3Utils.scale(this.#compagnon.location, -1),
          ),
        );
        this.#compagnon.applyImpulse({
          x: Number.isFinite(direction.x) ? direction.x * 0.5 : 0.5,
          y: 0.4,
          z: Number.isFinite(direction.z) ? direction.z * 0.5 : 0.5,
        });
        this.#mouvement_datas.lastPositionTime = 0;
        this.#mouvement_datas.lastPosition = currentPosition;
      }
    } else {
      this.#mouvement_datas.lastPositionTime = 0;
      this.#mouvement_datas.lastPosition = currentPosition;
    }

    debugLog("[move] - trigger compagnon moving");
    if (targetEntity) {
      this.#compagnon.navigateToEntity(targetEntity);
    } else {
      this.#compagnon.navigateToLocation(targetLocation);
    }
  }

  // #region - Compagnon behavior

  /**
   *
   * @returns {boolean}
   */
  #sleepBehavior() {
    debugLog("[SleepBehavior] - Compagnon need to sleep");

    // TODO : Feed a bed nearest you and sleep
    return false;
  }

  #farmingMobsBehavior() {
    const availableStackItem = this.#compagnon.dimension
      .getEntities({
        location: this.#compagnon.location,
        maxDistance: 5,
      })
      .filter((e) => e.hasComponent(EntityComponentTypes.Item))
      .sort((a, b) => this.#nearestFromCompagnon(a.location, b.location));

    const mobs = world.getDimension(this.#compagnon.dimension.id).getEntities({
      location: this.#compagnon.location,
      maxDistance: 20,
      families: ["mob"],
      excludeFamilies: ["player"],
    });

    const monstersMobs = mobs
      .filter((m) =>
        m
          .getComponent(EntityComponentTypes.TypeFamily)
          ?.hasTypeFamily("monster"),
      )
      .sort((a, b) => this.#nearestFromCompagnon(a.location, b.location));

    const farmableMobs = mobs
      .filter((m) => FOOD_MOBS.has(m.typeId))
      .sort((a, b) => this.#nearestFromCompagnon(a.location, b.location));

    if (availableStackItem.length > 0) {
      debugLog("[FarmMobBehavior] - Compagnon is picking up items");
      this.#behavior = "pick_item";
      this.#target_item = availableStackItem[0];
    } else if (
      monstersMobs.length > 0 &&
      Vector3Utils.distance(
        this.#compagnon.location,
        monstersMobs[0].location,
      ) < 5
    ) {
      debugLog("[FarmMobBehavior] - Compagnon is fighting a monster");
      this.#behavior = "fight";
      this.#target_entity = monstersMobs[0];
    } else if (farmableMobs.length > 0) {
      debugLog("[FarmMobBehavior] - Compagnon is farming a mob");
      this.#behavior = "fight";
      this.#target_entity = farmableMobs[0];
    } else {
      // If there are no target randomPatrol
      if (this.#farming_behavior_datas.checkpoint !== null) {
        if (
          Vector3Utils.distance(
            this.#compagnon.location,
            this.#farming_behavior_datas.checkpoint,
          ) <= 3
        ) {
          debugLog("[FarmMobBehavior] - Compagnon resetting checkpoint");
          this.#farming_behavior_datas.checkpoint = null;
        } else {
          this.#behavior = "move_to_location";
          this.#target_location = this.#farming_behavior_datas.checkpoint;
        }
      } else {
        const randomPoint = getRandomPointAround(
          this.#compagnon.location,
          10,
          20,
        );
        const topBlock = world
          .getDimension(this.#compagnon.dimension.id)
          .getTopmostBlock({
            x: randomPoint.x,
            z: randomPoint.z,
          });

        if (topBlock) {
          debugLog(
            "[FarmMobBehavior] - Compagnon setting new checkpoint : " +
              topBlock.location,
          );
          this.#farming_behavior_datas.checkpoint = {
            ...topBlock.location,
            y: topBlock.location.y + 1,
          };
          this.#behavior = "move_to_location";
          this.#target_location = this.#farming_behavior_datas.checkpoint;
        } else {
          debugLog(
            "[FarmMobBehavior] - Compagnon could not find a valid checkpoint",
          );
        }
      }
    }
  }

  /**
   * @param {Entity|null} entity
   */
  setOwnerEntityTarget(entity) {
    if (!entity || !entity.isValid || entity === this.#owner) {
      this.#ownerEntityTarget = null;
      return;
    }

    this.#ownerEntityTarget = entity;
  }

  #defaultBehavior() {
    const nearbyDroppedItems = this.#compagnon.dimension
      .getEntities({
        location: this.#compagnon.location,
        maxDistance: 2,
      })
      .filter((e) => e.hasComponent(EntityComponentTypes.Item))
      .sort((a, b) => this.#nearestFromCompagnon(a.location, b.location));

    if (nearbyDroppedItems.length > 0) {
      this.#target_item = nearbyDroppedItems[0];

      if (!this.#target_item || !this.#target_item.isValid) {
        this.#target_item = null;
      } else {
        this.#compagnon.navigateToEntity(this.#target_item);
        return;
      }
    }

    if (this.#ownerEntityTarget && this.#ownerEntityTarget.isValid) {
      const distanceBetweenOwnerTarget = Vector3Utils.distance(
        this.#compagnon.location,
        this.#ownerEntityTarget.location,
      );

      if (distanceBetweenOwnerTarget <= 10) {
        if (distanceBetweenOwnerTarget > 3) {
          this.#compagnon.navigateToEntity(this.#ownerEntityTarget);
          return;
        }

        this.#compagnon.selectedSlotIndex = 0;
        this.#compagnon.stopMoving();
        this.#compagnon.attackEntity(this.#ownerEntityTarget);
        return;
      }

      this.#ownerEntityTarget = null;
    }

    const hostileMobs = this.#compagnon.dimension
      .getEntities({
        location: this.#compagnon.location,
        maxDistance: 8,
        families: ["monster"],
      })
      .sort((a, b) => this.#nearestFromCompagnon(a.location, b.location));

    if (hostileMobs.length > 0) {
      const target = hostileMobs[0];
      const distanceBetweenHostile = Vector3Utils.distance(
        this.#compagnon.location,
        target.location,
      );

      if (distanceBetweenHostile <= 5) {
        if (distanceBetweenHostile > 3) {
          this.#compagnon.navigateToEntity(target);
          return;
        }

        if (this.#compagnon.selectedSlotIndex !== 0)
          this.#compagnon.selectedSlotIndex = 0;
        this.#compagnon.stopMoving();
        this.#compagnon.attackEntity(target);
        this.#compagnon.lookAtEntity(target);
        return;
      }
    }

    const distanceBetweenOwner = Vector3Utils.distance(
      this.#compagnon.location,
      this.#owner.location,
    );

    if (distanceBetweenOwner > 15) {
      this.#compagnon.teleport(this.#owner.location);
    }

    if (distanceBetweenOwner > 3 && distanceBetweenOwner < 15) {
      this.#compagnon.navigateToEntity(this.#owner);
    } else {
      this.#compagnon.stopMoving();
      this.#compagnon.lookAtEntity(this.#owner);
    }
  }

  // ====================================================================
  //                    Full behavior management
  // ====================================================================
  // compagnonBehavior() {
  //   // Initiate default behavior
  //   this.#behavior = null;

  //   if (this.#target_entity && !this.#target_entity.isValid) {
  //     this.#target_entity = null;
  //   }
  //   if (this.#target_item && !this.#target_item.isValid) {
  //     this.#target_item = null;
  //   }
  //   if (this.#target_location && this.#behavior !== "move_to_location") {
  //     this.#target_location = null;
  //   }

  //   // Get distance between owner and compagnon
  //   const distanceBetweenOwner = Vector3Utils.distance(
  //     this.#compagnon.location,
  //     this.#owner.location,
  //   );

  //   const shouldPrioritizeFarm = this.#hasForcedBehavior([
  //     "kill_mobs_for_food",
  //     "farm_in_champs",
  //   ]);

  //   // Forced Behavior Management
  //   if (this.#hasForcedBehavior(["default"])) {
  //     this.#defaultBehavior();
  //     return;
  //   }

  //   if (this.#hasForcedBehavior(["kill_mobs_for_food"])) {
  //     this.#farmingMobsBehavior();
  //   }

  //   // Prendre un equipement a terre
  //   if (this.#behavior == "pick_item") {
  //     debugLog("[CompagnonBehavior] - Compagnon is picking an item");
  //     if (!this.#target_item || !this.#target_item.isValid) {
  //       return (this.#behavior = null);
  //     }

  //     this.#move({ type: "entity", entity: this.#target_item });
  //     // Attacker une entite
  //   } else if (this.#behavior == "fight") {
  //     if (!this.#target_entity || !this.#target_entity.isValid) {
  //       return (this.#behavior = null);
  //     }

  //     const distanceBetweenTarget = Vector3Utils.distance(
  //       this.#compagnon.location,
  //       this.#target_entity.location,
  //     );

  //     if (distanceBetweenTarget > 3) {
  //       this.#move({ type: "entity", entity: this.#target_entity });
  //     } else {
  //       this.#compagnon.stopMoving();
  //       this.#compagnon.attackEntity(this.#target_entity);
  //     }

  //     // Se diriger a une location
  //   } else if (this.#behavior == "move_to_location" && this.#target_location) {
  //     debugLog("[CompagnonBehavior] - Compagnon is moving to a location");
  //     this.#compagnon.lookAtLocation(this.#target_location);
  //     this.#move({ type: "location", location: this.#target_location });

  //     // Suivre le joueur
  //   } else if (this.#forced_behavior == "follow_player") {
  //     if (distanceBetweenOwner > 15) {
  //       // following conditions
  //       this.#compagnon.teleport(this.#owner.location);
  //     }
  //     if (distanceBetweenOwner > 3 && distanceBetweenOwner < 15) {
  //       this.#move({ type: "entity", entity: this.#owner });
  //     } else {
  //       this.#compagnon.stopMoving();
  //       this.#compagnon.lookAtEntity(this.#owner);
  //     }
  //   }
  // }

  compagnonBehavior() {
    // Recurent Check
    this.#recurentsCheck();

    // Behavior Management

    if (this.#sleepBehavior()) return;

    this.#defaultBehavior();
  }
}
