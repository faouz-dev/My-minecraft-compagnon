import {
  Block,
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
  type Vector3,
  BlockVolumeBase,
  type EntityQueryOptions,
  type EntityComponentReturnType,
  Dimension,
  BlockVolume,
  RawMessage,
  BlockComponentTypes,
  BlockComponentReturnType,
  EffectTypes,
  EffectType,
  system,
  BlockInventoryComponent,
} from "@minecraft/server";
import { getPlayerSkin, LookDuration, SimulatedPlayer } from "@minecraft/server-gametest";
import { Vector2Utils, Vector3Utils } from "@minecraft/math";
import { debugLog } from "../functions/debugLog";
import { CompagnonDBManager } from "./CompagnonDBManager";
import { checkforBestItem, type ItemPurpose } from "../functions/checkforBestItem";
import { FOOD_MOBS } from "../constants/foodMobs";
import { getRandomPointAround } from "../functions/getRandomPointAround";
import {
  MinecraftBlockTypes,
  MinecraftDimensionTypes,
  MinecraftEffectTypes,
  MinecraftEntityTypes,
  MinecraftItemTypes,
} from "@minecraft/vanilla-data";
import { createCube } from "../functions/createCube";
import { isBedOccupied } from "../functions/isBedOccuped";
import { checkForBestFood, FOOD_SCORES } from "../functions/checkForBestFood";
import { isDebug } from "../constants/isDebug";
import { safestDirectionFromMob } from "../functions/safestDirectionFromMob";
import { roundDirection } from "../functions/roundDirection";
import { findDoubleChestBlocks } from "../functions/findDoubleChestBlocks";

export type ForcedBehavior = "default" | "follow_player" | "mobs_farming" | "crop_farming";

export class CompagnonManager {
  //=================================================
  // #region Variable Declaration
  //=================================================

  // compagnon configuration properties
  private behavior: string | null = null;
  private _forced_behavior: ForcedBehavior = "default";
  private shouldSleep: boolean = false;

  // targetting properties
  private target_entity: Entity | null = null;
  private target_item: Entity | null = null;
  private _ownerEntityTarget: Entity | null = null;
  private target_location: Vector3 | null = null;

  // Datas properties
  private mouvement_datas!: { lastPosition: Vector3; lastPositionTime: number };

  private farming_behavior_datas: {
    checkpoint: Vector3 | null;
    action: string | null;
  } = { checkpoint: null, action: null };

  private sleep_behavior_data: { noBedFoundMessageCooldown: number } = {
    noBedFoundMessageCooldown: 0,
  };
  private eat_behavior_data: { startEating: boolean } = { startEating: false };
  private crop_farming_behavior_data: {
    area:
      | {
          dimension: MinecraftDimensionTypes | undefined;
          waypoints: { p1: Vector3; p2: Vector3 } | undefined;
          warnNoAreaProvided: boolean;
          warnNoFarmLandInAreaSelected: boolean;
        }
      | undefined;
    chest: {
      chestPosition: Vector3 | undefined;
      chest: Block | undefined;
      avertissementMade: boolean;
    };
  } = {
    area: undefined,
    chest: {
      chestPosition: undefined,
      chest: undefined,
      avertissementMade: false,
    },
  };

  private is_selecting_farm_area_datas: { p1: Vector3 | null; p2: Vector3 | null } = { p1: null, p2: null };

  //=================================================
  // #endregion Variable Declaration
  //==================================================

  constructor(
    private readonly _compagnon: SimulatedPlayer,
    private readonly _owner: Player
  ) {
    // this.compagnon = compagnon;
    // this.owner = owner;

    this.config();
  }

  //======================================================
  // #region Getters and Setters
  //======================================================

  set ownerEntityTarget(entity: Entity | null) {
    if (!entity || !entity.isValid || entity === this._owner) {
      this._ownerEntityTarget = null;
      return;
    }

    this._ownerEntityTarget = entity;
  }

  get compagnon() {
    return this._compagnon;
  }

  get forced_behavior() {
    return this._forced_behavior;
  }

  get owner() {
    return this._owner;
  }

  //======================================================
  // #endregion Getters and Setters
  //======================================================

  // =====================================================
  // #region Utilites
  // =====================================================

  private config() {
    // Set Skin
    const playerSkin = getPlayerSkin(this._owner);
    this._compagnon.setSkin(playerSkin);
    debugLog(`[Config] - Compagnon skin set`);

    // Initialise Values
    this.mouvement_datas = {
      lastPosition: this._compagnon.location,
      lastPositionTime: 0,
    };
  }

  /**
   * @description - Update the variable that need a recurent checking;
   */
  private recurentsCheck() {
    if (this._owner.isSleeping) {
      this.shouldSleep = true;
    } else {
      this.shouldSleep = false;
    }
  }

  private nearestFromCompagnon(a: Vector3, b: Vector3) {
    return Vector3Utils.distance(a, this._compagnon.location) - Vector3Utils.distance(b, this._compagnon.location);
  }

  /**
   * @param {ForcedBehavior} behavior
   */
  updateBehavior(behavior: ForcedBehavior) {
    this._forced_behavior = behavior;
    CompagnonDBManager.updateCompagnonData(this._owner, {
      forced_behavior: behavior,
    });
    this._owner.sendMessage({ translate: "info.mycompagnon:compagnon.behavior_updated" });
    debugLog(`Compagnon behavior updated to ${behavior}`);
  }

  /**
   * @param {ForcedBehavior[]} behaviors
   * @returns
   */
  private hasForcedBehavior(behaviors: ForcedBehavior[]) {
    return behaviors.includes(this._forced_behavior);
  }

  private getInventoryComponent(): EntityInventoryComponent {
    return this._compagnon.getComponent(EntityComponentTypes.Inventory)!;
  }

  private getEquipableComponent(): EntityEquippableComponent {
    return this._compagnon.getComponent(EntityComponentTypes.Equippable)!;
  }

  private tellOwner(message: string) {
    this._owner.sendMessage([`§l§u[${this._compagnon.name}]§r§e=>§r`, { translate: message }]);
  }

  /**
   * @description - Update the armor set behavior
   */
  private armorUpdater() {
    const equipableComponent = this.getEquipableComponent();
    const inventoryComponent = this.getInventoryComponent();

    // Case Head
    for (const armorSlot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet]) {
      const hasArmorOnSlot = equipableComponent.getEquipment(armorSlot);
      const bestArmorForSlot = checkforBestItem(hasArmorOnSlot, inventoryComponent.container, armorSlot);
      if (bestArmorForSlot.shouldChange) {
        debugLog(`[ArmorUpdater] - Compagnon should change helmet : ${bestArmorForSlot.bestItem?.type}`);
        try {
          equipableComponent.setEquipment(armorSlot, bestArmorForSlot.bestItem?.clone());
          // @ts-ignore
          inventoryComponent.container.setItem(bestArmorForSlot.index);
          debugLog("[ArmorUpdater] - Compagnon armor set on slot " + armorSlot);
        } catch (error) {
          debugLog(`[ArmorUpdater] - Error on setting compagnon armor :` + error);
        }
      }
    }
  }

  /**
   * @description - Update the offhand's tool
   */
  private offHandUpdater() {
    const equipableComponent = this.getEquipableComponent();
    const inventoryComponent = this.getInventoryComponent();

    const hasOffhandTool = equipableComponent.getEquipment(EquipmentSlot.Offhand);
    const bestOffhandTool = checkforBestItem(hasOffhandTool, inventoryComponent.container, EquipmentSlot.Offhand);
    if (bestOffhandTool.shouldChange && bestOffhandTool.index !== undefined) {
      debugLog(`[OffHandUpdater] - Compagnon should change offhand tool : ${bestOffhandTool.bestItem?.type}`);
      try {
        equipableComponent.setEquipment(EquipmentSlot.Offhand, bestOffhandTool.bestItem?.clone());
        inventoryComponent.container.setItem(bestOffhandTool.index);
        debugLog("[OffHandUpdater] - Compagnon offhand tool set on slot " + EquipmentSlot.Offhand);
      } catch (error) {
        debugLog(`[OffHandUpdater] - Error on setting compagnon offhand tool :` + error);
      }
    }
  }

  private UtilsItemsOrganiser() {
    const inventoryComponent = this.getInventoryComponent();
    const equipableComponent = this.getEquipableComponent();

    /**
     * @type {import("../functions/checkforBestItem").ItemPurpose[]}
     */
    const hotbarConfiguration = ["combat", "woodcutting", "mining"] as ItemPurpose[];

    for (let i = 0; i < 3; i++) {
      const currentItem = inventoryComponent.container.getItem(i);
      const bestItem = checkforBestItem(
        currentItem,
        inventoryComponent.container,
        EquipmentSlot.Mainhand,
        hotbarConfiguration[i]
      );

      if (bestItem.shouldChange && bestItem.index !== undefined) {
        inventoryComponent.container.swapItems(i, bestItem.index, inventoryComponent.container);
        debugLog("[UtilsItemsOrganiser] - Compagnon item set on slot ");
      }
    }
  }

  /**
   * @description - this function is called whenever compagnon's inventory get updated
   */
  onInventoryUpdate() {
    debugLog("[InventoryUpdate] - Compagnon inventory update triggered for " + this._compagnon.name);

    //  Offhand - Updater
    this.offHandUpdater();

    // HotBar Configuration
    this.UtilsItemsOrganiser();

    //Armor Set Updater
    this.armorUpdater();
  }

  private move(
    target:
      | {
          type: "entity" | "location";
          entity?: Entity;
          location?: Vector3;
        }
      | Entity
      | Vector3
  ) {
    const targetData =
      target && typeof target === "object" && "type" in target
        ? target
        : target && typeof target === "object" && "location" in target
          ? { type: "entity", entity: target }
          : { type: "location", location: target };

    const targetEntity = targetData.type === "entity" ? targetData.entity : null;
    const targetLocation =
      targetData.type === "location" ? targetData.location : targetEntity ? targetEntity.location : null;

    if (!targetLocation) {
      debugLog("[move] - Compagnon has no target location");
      return;
    }

    const currentPosition = this._compagnon.location;
    const distanceMoved = Vector3Utils.distance(currentPosition, this.mouvement_datas.lastPosition);
    const beingStuckSince = this.mouvement_datas.lastPositionTime;

    if (Vector3Utils.distance(currentPosition, targetLocation) < 0.8) {
      this.mouvement_datas.lastPositionTime = (this.mouvement_datas.lastPositionTime ?? 0) + 1;
      if (beingStuckSince > 5) {
        debugLog("[move] - Compagnon is stuck applying impluse");
        const direction = Vector3Utils.normalize(
          Vector3Utils.add(targetLocation, Vector3Utils.scale(this._compagnon.location, -1))
        );
        this._compagnon.applyImpulse({
          x: Number.isFinite(direction.x) ? direction.x * 0.5 : 0.5,
          y: 0.4,
          z: Number.isFinite(direction.z) ? direction.z * 0.5 : 0.5,
        });
        this.mouvement_datas.lastPositionTime = 0;
        this.mouvement_datas.lastPosition = currentPosition;
      }
    } else {
      this.mouvement_datas.lastPositionTime = 0;
      this.mouvement_datas.lastPosition = currentPosition;
    }

    debugLog("[move] - trigger compagnon moving");
    if (targetEntity) {
      this._compagnon.navigateToEntity(targetEntity);
    } else {
      this._compagnon.navigateToLocation(targetLocation);
    }
  }

  private updateNameTag() {
    const health = this._compagnon.getComponent(EntityComponentTypes.Health)!.currentValue;

    const hearts = Math.round(health / 2);

    this._compagnon.nameTag =
      `§l§f${this.compagnon.name}§r\n` + `§c❤ §f${hearts} §7HP§r\n` + `§8✦ owner : §f${this._owner.name}`;
  }

  /**
   * @description - this function is called when the staff of autority is used on block to verify if it's selecting farm area
   */
  public isSelectingFarmArea(block: Block): boolean {
    if (this.forced_behavior !== "crop_farming") return false;
    debugLog("[isFarmAreaSelected] - Compagnon is in farm area selection mode");

    if (block && block.type.id === MinecraftBlockTypes.Chest) {
      debugLog("[isFarmAreaSelected] - Compagnon is selecting chest");
      this.crop_farming_behavior_data.chest = {
        chestPosition: block.location,
        chest: block,
        avertissementMade: false,
      };
    } else {
      if (this.is_selecting_farm_area_datas.p1) {
        debugLog("[isFarmAreaSelected] - Compagnon is selecting p2");
        // Reset farming behavior datas
        this.crop_farming_behavior_data.area = {
          dimension: this._owner.dimension.id as MinecraftDimensionTypes,
          waypoints: { p1: this.is_selecting_farm_area_datas.p1!, p2: block.location },
          warnNoAreaProvided: false,
          warnNoFarmLandInAreaSelected: false,
        };
        const LimitsBlock: Vector3[] = [];
        for (let i = 0; i < Math.abs(this.is_selecting_farm_area_datas.p1.x - block.location.x); i++) {
          const x =
            this.is_selecting_farm_area_datas.p1.x < block.location.x
              ? this.is_selecting_farm_area_datas.p1.x + i
              : this.is_selecting_farm_area_datas.p1.x - i;
          LimitsBlock.push({ x, y: this.is_selecting_farm_area_datas.p1.y, z: this.is_selecting_farm_area_datas.p1.z });
        }
        for (let i = 0; i < Math.abs(this.is_selecting_farm_area_datas.p1.z - block.location.z); i++) {
          const z =
            this.is_selecting_farm_area_datas.p1.z < block.location.z
              ? this.is_selecting_farm_area_datas.p1.z + i
              : this.is_selecting_farm_area_datas.p1.z - i;
          LimitsBlock.push({ x: this.is_selecting_farm_area_datas.p1.x, y: this.is_selecting_farm_area_datas.p1.y, z });
        }

        const interval = system.runInterval(() => {
          LimitsBlock.forEach((block) => {
            this._owner.dimension.spawnParticle("minecraft:villager_happy", {
              ...block,
              y: block.y + 1.5,
            });
          });
        }, 5);

        system.runTimeout(() => {
          system.clearRun(interval);
        }, 1 * 20);

        debugLog("[isFarmAreaSelected] -Farm area selected");
      } else {
        this.is_selecting_farm_area_datas.p1 = block.location;
        debugLog("[isFarmAreaSelected] - Compagnon is selected p1 : " + JSON.stringify(block.location, undefined, 1));
      }
    }

    return true;
  }

  // ======================================================
  // #endregion - Utilities
  // ======================================================

  //======================================================
  // #region - CONSTITUTIONNAL BEHAVIORS
  //======================================================

  /**
   * @description Check if the compagnon should sleep
   */
  private sleepBehavior(): boolean {
    if (!this.shouldSleep) return false;

    if (!this._compagnon.isSleeping) {
      debugLog("[SleepBehavior] - Compagnon need to sleep");
      const nearestBedArroundPlayer = this._owner.dimension.getBlocks(createCube(this._owner.location, 20), {
        includeTypes: [MinecraftBlockTypes.Bed],
      });
      const nearestBedArroundBot = this._compagnon.dimension.getBlocks(createCube(this._compagnon.location, 20), {
        includeTypes: [MinecraftBlockTypes.Bed],
      });

      let nearestAvailableBed = null;

      for (const bed of nearestBedArroundBot.getBlockLocationIterator()) {
        const block = this._compagnon.dimension.getBlock(bed);
        if (block?.typeId !== MinecraftBlockTypes.Bed) continue;
        const isOccuped = isBedOccupied(block);
        if (isOccuped) continue;
        debugLog("[SleepBehavior] - Compagnon locate a bed nearest him");
        nearestAvailableBed = block;
        break;
      }

      if (!nearestAvailableBed) {
        for (const bed of nearestBedArroundPlayer.getBlockLocationIterator()) {
          const block = this._owner.dimension.getBlock(bed);
          if (block?.typeId !== MinecraftBlockTypes.Bed) continue;
          const isOccuped = isBedOccupied(block);
          if (isOccuped) continue;
          debugLog("[SleepBehavior] - Compagnon locate a bed nearest player");
          nearestAvailableBed = block;
          break;
        }
      }

      if (!nearestAvailableBed) {
        debugLog("[SleepBehavior] - Compagnon has no bed around");
        // Attendre 10 Seconde avant de l'avertir encore une fois
        if (this.sleep_behavior_data.noBedFoundMessageCooldown == 0) {
          this._owner.sendMessage("You need to build a bed for your compagnon");
          this.sleep_behavior_data.noBedFoundMessageCooldown = 20 * 10;
        } else {
          this.sleep_behavior_data.noBedFoundMessageCooldown = this.sleep_behavior_data.noBedFoundMessageCooldown - 1;
        }
      } else {
        debugLog("[SleepBehavior] - Compagnon Found A bed");

        this._compagnon.teleport(nearestAvailableBed);
        this._compagnon.interactWithBlock(nearestAvailableBed);
      }
    } else {
      debugLog("[SleepBehavior] - Compagnon is sleeping");
    }
    // Return true to break all other logique on other behavior
    return true;
  }

  /**
   * @description Check if Exist an nearest droped item and take it
   */
  private getNearestDropedItemBehavior(options: Pick<EntityQueryOptions, "maxDistance"> = { maxDistance: 2 }): boolean {
    const nearbyDroppedItems = this._compagnon.dimension
      .getEntities({
        location: this._compagnon.location,
        ...options,
      })
      .filter((e) => e.hasComponent(EntityComponentTypes.Item))
      .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

    if (nearbyDroppedItems.length == 0) return false;
    debugLog(
      "[GetNearestDropedItemBehavior] - Compagnon Found " +
        nearbyDroppedItems.length +
        " item(s) in range " +
        options.maxDistance
    );
    this.target_item = nearbyDroppedItems[0];

    if (!this.target_item || !this.target_item.isValid) {
      this.target_item = null;
      debugLog("[GetNearestDropedItemBehavior] - Compagnon can't find item");
      return false;
    }
    debugLog("[GetNearestDropedItemBehavior] - Compagnon found item");
    this._compagnon.navigateToEntity(this.target_item);
    return true;
  }

  /**
   * @description - Check if the owner is attacking a target and attack if exists
   */
  private shouldAttackOwnerTargetBehavior(
    {
      shouldIgnoreRange,
    }: {
      shouldIgnoreRange: number;
    } = { shouldIgnoreRange: 10 }
  ): boolean {
    if (!this._ownerEntityTarget) return false;
    if (!this._ownerEntityTarget.isValid) {
      debugLog("[ShouldAttackOwnerTargetBehavior] - Owner target is invalid");
      this._ownerEntityTarget = null;
      return false;
    }
    const distanceBetweenOwnerTarget = Vector3Utils.distance(
      this._compagnon.location,
      this._ownerEntityTarget.location
    );

    if (distanceBetweenOwnerTarget > shouldIgnoreRange) {
      debugLog("[ShouldAttackOwnerTargetBehavior] - Owner target is too far");
      this._ownerEntityTarget = null;
      return false;
    }
    if (distanceBetweenOwnerTarget > 3) {
      this._compagnon.navigateToEntity(this._ownerEntityTarget);
    } else {
      this._compagnon.selectedSlotIndex = 0;
      this._compagnon.stopMoving();
      this._compagnon.attackEntity(this._ownerEntityTarget);
    }
    return true;
  }

  private shouldAttackNearestMonsterMobs(
    options: Pick<EntityQueryOptions, "maxDistance"> = { maxDistance: 10 }
  ): boolean {
    const hostileMobs = this._compagnon.dimension
      .getEntities({
        location: this._compagnon.location,
        maxDistance: options.maxDistance,
        families: ["monster"],
      })
      .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

    if (hostileMobs.length == 0) false;
    const target = hostileMobs[0];
    if (!target || !target.isValid) return false;
    const distanceBetweenHostile = Vector3Utils.distance(this._compagnon.location, target.location);

    if (distanceBetweenHostile > options.maxDistance!) {
      debugLog("[ShouldAttackNearestMonsterMobs] - Hostile mob is too far");
      return false;
    }
    if (distanceBetweenHostile > 3) {
      debugLog("[ShouldAttackNearestMonsterMobs] - Compagnon is navigating to hostile mob");
      this._compagnon.navigateToEntity(target);
    } else {
      debugLog("[ShouldAttackNearestMonsterMobs] - Compagnon is attacking");
      if (this._compagnon.selectedSlotIndex !== 0) this._compagnon.selectedSlotIndex = 0;
      this._compagnon.stopMoving();
      this._compagnon.attackEntity(target);
      this._compagnon.lookAtEntity(target, LookDuration.UntilMove);
    }

    return true;
  }

  /**
   * @description - Check if the compagnon can follow player and follow
   */
  private shouldfollowPlayerBehavior(): boolean {
    if (!this._owner.isValid) return false;
    const distanceBetweenOwner = Vector3Utils.distance(this._compagnon.location, this._owner.location);

    if (distanceBetweenOwner > 15) {
      this._compagnon.teleport(this._owner.location);
    }

    if (distanceBetweenOwner > 3 && distanceBetweenOwner < 15) {
      this._compagnon.navigateToEntity(this._owner);
    } else {
      this._compagnon.stopMoving();
      this._compagnon.lookAtEntity(this._owner, LookDuration.UntilMove);
    }

    return true;
  }

  private shouldEatBehavior(
    { shouldEatAt, ShouldEatUntil }: { shouldEatAt: number; ShouldEatUntil: number } = {
      shouldEatAt: 6,
      ShouldEatUntil: 20,
    }
  ): boolean {
    const hungerComponent = this._compagnon.getComponent(EntityComponentTypes.Hunger)!;
    if (hungerComponent.currentValue > shouldEatAt && !this.eat_behavior_data.startEating) return false;

    if (hungerComponent.currentValue >= ShouldEatUntil) {
      debugLog("[ShouldEatBehavior] - Compagnon reach acceptable value");
      this.eat_behavior_data.startEating = false;
      return false;
    }
    const inventoryContainer = this.getInventoryComponent();

    if (this.eat_behavior_data.startEating == true) {
      const item = inventoryContainer.container.getItem(8);
      if (!item) {
        debugLog("[ShouldEatBehavior] - Compagnon food finished in slot 8");
        this.eat_behavior_data.startEating = false;
      } else if (!Object.keys(FOOD_SCORES).includes(item.typeId)) {
        debugLog("[ShouldEatBehavior] - Compagnon item in slot 8 is not a food");
        this.eat_behavior_data.startEating = false;
      } else {
        debugLog("[ShouldEatBehavior] - Compagnon is eating");
        this._compagnon.useItemInSlot(8);
      }
    } else {
      const bestFound = checkForBestFood(inventoryContainer.container, false, false);

      if (!bestFound.foundFood) {
        debugLog("[ShouldEatBehavior] - Compagnon has no food");
        return false;
      }

      if (bestFound.slotIndex! !== 8) {
        inventoryContainer.container.swapItems(8, bestFound.slotIndex!, inventoryContainer.container);
      }
      debugLog("[ShouldEatBehavior] - Compagnon swipped found 0p splot 8");
      this.eat_behavior_data.startEating = true;
    }

    return true;
  }

  private shouldAvoidMobsBehavior(props: { maxDistance: number } = { maxDistance: 3 }): boolean {
    const { maxDistance } = props;

    const nearestMonster = this._compagnon.dimension.getEntities({
      location: this._compagnon.location,
      maxDistance: maxDistance,
      families: ["monster"],
    });

    if (nearestMonster.length == 0) return false;
    if (!nearestMonster[0].isValid) return false;

    if (nearestMonster[0].typeId === "minecraft:creeper") {
      if (
        this.shouldProtectFromCreeperExplosionIfHasShield({
          creeper: nearestMonster[0],
        })
      )
        return true;
    }

    debugLog("[ShouldAvoidMobsBehavior] - Compagnon have to avoid mobs");
    const safestDirection = safestDirectionFromMob(
      nearestMonster[0].location,
      this._compagnon.location,
      this._compagnon.dimension
    );

    if (!safestDirection) return false;
    debugLog("[safestDirecction] - Compagnon is moving to safest direction");
    this._compagnon.move(safestDirection.x, safestDirection.z, 1);

    return true;
  }

  private shouldHealBehavior(
    props: { acceptableHealth: number; critiqueProtectionAt: number } = {
      acceptableHealth: 20,
      critiqueProtectionAt: 6,
    }
  ): boolean {
    const healthComponent = this._compagnon.getComponent(EntityComponentTypes.Health)!;

    if (healthComponent.currentValue >= props.acceptableHealth) return false;
    debugLog("[ShouldHealBehavior] - Compagnon need to Heal");

    // priority 1 eat food
    if (this.shouldEatBehavior({ shouldEatAt: 19, ShouldEatUntil: 20 })) return true;

    //priority 2 avoid mob if no found
    if (healthComponent.currentValue <= props.critiqueProtectionAt) {
      if (this.shouldAvoidMobsBehavior({ maxDistance: 3 })) return true;
    }

    return false;
  }

  private shouldProtectFromCreeperExplosionIfHasShield(
    options: { maxDistance?: number; creeper?: Entity } = {
      maxDistance: 5,
    }
  ): boolean {
    let creeper: Entity | null = null;
    if (options.creeper) {
      creeper = options.creeper;
    } else {
      const existingCreeper = this._compagnon.dimension.getEntities({
        location: this._compagnon.location,
        maxDistance: options.maxDistance,
        type: MinecraftEntityTypes.Creeper,
        closest: 1,
      });

      if (existingCreeper.length > 0) {
        creeper = existingCreeper[0];
      } else {
      }
    }

    if (!creeper) return false;
    if (creeper && !creeper.isValid) {
      debugLog("[ShouldProtectFromCreeperExplosionIfHasShield] - Creeper invalid, stopping sneak");
      if (this._compagnon.isSneaking) this._compagnon.isSneaking = false;
      return false;
    }
    debugLog("[ShouldProtectFromCreeperExplosionIfHasShield] - Compagnon need to protect from creeper explosion");
    const hasShield = this.getEquipableComponent().getEquipmentSlot(EquipmentSlot.Offhand);
    try {
      if (!hasShield || !hasShield.isValid || hasShield.typeId !== MinecraftItemTypes.Shield) {
        debugLog("[ShouldProtectFromCreeperExplosionIfHasShield] - No shield equipped");
        return false;
      }
    } catch (error) {
      debugLog(
        "[ShouldProtectFromCreeperExplosionIfHasShield] - Error considering as no shield equiped No shield equipped"
      );
      return false;
    }
    debugLog("[ShouldProtectFromCreeperExplosionIfHasShield] - Has shield, looking at creeper and sneaking");
    this.compagnon.stopMoving();
    this.compagnon.lookAtEntity(creeper, LookDuration.UntilMove);
    this._compagnon.isSneaking = true;

    return true;
  }

  private shouldPutItemIntoContainer(props: {
    force?: boolean;
    clear?: boolean;
    container: Block;
    filter?: (item: ItemStack) => boolean;
  }): boolean {
    let { container } = props;

    // verify if is an block with  container
    const inventoryComponent = container.getComponent(BlockComponentTypes.Inventory);
    if (!inventoryComponent) {
      debugLog("[ShouldPutItemIntoContainer] - Container is not a container");
      return false;
    }

    let SpawnAt: Vector3 | null = null;

    // Verify if it's accessible
    if (container.typeId === MinecraftBlockTypes.Chest) {
      const possibleChestBlocks = findDoubleChestBlocks(container);

      for (const possibleChest of possibleChestBlocks) {
        const blockAtTop = this._compagnon.dimension.getBlock(Vector3Utils.add(possibleChest.location, { y: 1 }));
        if (blockAtTop && blockAtTop.typeId !== MinecraftBlockTypes.Air) {
          this.tellOwner("message.mycompagnon:compagnon.cant_open_container");
          return false;
        }
      }
    } else if (container.typeId === MinecraftBlockTypes.Barrel) {
      const nearestBlock = this._compagnon.dimension.getBlocks(
        new BlockVolume(
          Vector3Utils.add(container.location, { z: -1, x: -1 }),
          Vector3Utils.add(container.location, { z: 1, x: 1 })
        ),
        {}
      );

      for (const blockPosition of nearestBlock.getBlockLocationIterator()) {
        const y_add = blockPosition === container.location ? +1 : 0;
        const blockAtTop = this._compagnon.dimension.getBlock(Vector3Utils.add(blockPosition, { y: y_add + 1 }));
        const block = this._compagnon.dimension.getBlock(Vector3Utils.add(blockPosition, { y: y_add }));
        if (
          blockAtTop &&
          blockAtTop.typeId !== MinecraftBlockTypes.Air &&
          block &&
          block.typeId == MinecraftBlockTypes.Air
        ) {
          SpawnAt = blockPosition;
          break;
        }
      }
      
    }

    if (!SpawnAt) {
      debugLog("[ShouldPutItemIntoContainer] - No place to spawn the barrel");
      this.tellOwner("message.mycompagnon:compagnon.cant_access_container");
      return false;
    }

    // Verify if container is Empty
    if (inventoryComponent.container!.emptySlotsCount == 0) {
      debugLog("[ShouldPutItemIntoContainer] - Container is not empty");
      return false;
    }

    // try teleport to point
    this._compagnon.tryTeleport(SpawnAt);

    this._compagnon.lookAtBlock(container, LookDuration.UntilMove);
    this._compagnon.interactWithBlock(container);

    return true;

    return true;
  }

  private shouldFarmCropBehavior(): boolean {
    const { area, chest } = this.crop_farming_behavior_data;

    // Case farming area in zone
    if (!area || !area.dimension || !area.waypoints) {
      if (!chest.avertissementMade) {
        this.tellOwner("message.mycompagnon:compagnon.no_farm_area_selected");
        chest.avertissementMade = true;
      }
      return false;
    }

    // warn but farm anyway if chest not set
    if (!chest.chestPosition) {
      if (!chest.avertissementMade) {
        this.tellOwner("message.mycompagnon:compagnon.no_farm_chest_selected");
        chest.avertissementMade = true;
      }
    }

    const farmableLandsInArea = world
      .getDimension(area.dimension)
      .getBlocks(new BlockVolume(area.waypoints.p1, area.waypoints.p2), {
        includeTypes: [MinecraftBlockTypes.Farmland],
      });

    const farmLandLength = Array.from(farmableLandsInArea.getBlockLocationIterator()).length;

    if (farmLandLength === 0) {
      if (!area.warnNoFarmLandInAreaSelected) {
        this.tellOwner("message.mycompagnon:compagnon.no_farmland_in_area_selected");
        area.warnNoFarmLandInAreaSelected = true;
        this.crop_farming_behavior_data.area = undefined;
      }
    }

    // Priority 1 : put farmedItemInInventory
    if (chest.chest) if (this.shouldPutItemIntoContainer({ container: chest.chest })) return true;

    return true;
  }

  // ======================================================================
  //                 #endregion Constitutionnal Behaviors
  //=======================================================================

  //=======================================================================
  //                      #region  Main Behaviors
  //=======================================================================

  private farmingMobsBehavior() {
    const availableStackItem = this._compagnon.dimension
      .getEntities({
        location: this._compagnon.location,
        maxDistance: 5,
      })
      .filter((e) => e.hasComponent(EntityComponentTypes.Item))
      .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

    const mobs = world.getDimension(this._compagnon.dimension.id).getEntities({
      location: this._compagnon.location,
      maxDistance: 20,
      families: ["mob"],
      excludeFamilies: ["player"],
    });

    const monstersMobs = mobs
      .filter((m) => m.getComponent(EntityComponentTypes.TypeFamily)?.hasTypeFamily("monster"))
      .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

    const farmableMobs = mobs
      .filter((m) => FOOD_MOBS.has(m.typeId))
      .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

    if (availableStackItem.length > 0) {
      debugLog("[FarmMobBehavior] - Compagnon is picking up items");
      this.behavior = "pick_item";
      this.target_item = availableStackItem[0];
    } else if (
      monstersMobs.length > 0 &&
      Vector3Utils.distance(this._compagnon.location, monstersMobs[0].location) < 5
    ) {
      debugLog("[FarmMobBehavior] - Compagnon is fighting a monster");
      this.behavior = "fight";
      this.target_entity = monstersMobs[0];
    } else if (farmableMobs.length > 0) {
      debugLog("[FarmMobBehavior] - Compagnon is farming a mob");
      this.behavior = "fight";
      this.target_entity = farmableMobs[0];
    } else {
      // If there are no target randomPatrol
      if (this.farming_behavior_datas.checkpoint !== null) {
        if (Vector3Utils.distance(this._compagnon.location, this.farming_behavior_datas.checkpoint) <= 3) {
          debugLog("[FarmMobBehavior] - Compagnon resetting checkpoint");
          this.farming_behavior_datas.checkpoint = null;
        } else {
          this.behavior = "move_to_location";
          this.target_location = this.farming_behavior_datas.checkpoint;
        }
      } else {
        const randomPoint = getRandomPointAround(this._compagnon.location, 10, 20);
        const topBlock = world.getDimension(this._compagnon.dimension.id).getTopmostBlock({
          x: randomPoint.x,
          z: randomPoint.z,
        });

        if (topBlock) {
          debugLog("[FarmMobBehavior] - Compagnon setting new checkpoint : " + topBlock.location);
          this.farming_behavior_datas.checkpoint = {
            ...topBlock.location,
            y: topBlock.location.y + 1,
          };
          this.behavior = "move_to_location";
          this.target_location = this.farming_behavior_datas.checkpoint;
        } else {
          debugLog("[FarmMobBehavior] - Compagnon could not find a valid checkpoint");
        }
      }
    }
  }

  private defaultBehavior() {
    // Priority 1 : Sleep if owner sleep
    if (this.sleepBehavior()) return;

    // Priority 2 : Heal if health is low
    if (this.shouldHealBehavior()) return;

    // Priority 3 : Block Creeper explosion if has shield
    if (this.shouldProtectFromCreeperExplosionIfHasShield()) return;

    // Priority 4 : Eat if hunger bar is low
    if (this.shouldEatBehavior({ shouldEatAt: 6, ShouldEatUntil: 20 })) return;

    // Priority 5 : Get dropped item in range 2 from compagnon
    if (this.getNearestDropedItemBehavior({ maxDistance: 2 })) return;

    // Priority 6 : Attack owner target if exists
    if (this.shouldAttackOwnerTargetBehavior({ shouldIgnoreRange: 10 })) return;

    // Priority 7 : Attack nearest monster mob
    if (this.shouldAttackNearestMonsterMobs({ maxDistance: 8 })) return;

    // Priority 8 : Follow owner
    if (this.shouldfollowPlayerBehavior()) return;
  }

  private cropFarmingBehavior() {
    // Priority 1 : Sleep if owner sleep
    if (this.sleepBehavior()) return;

    // Priority 2 : Heal if health is low
    if (this.shouldHealBehavior()) return;

    // Priority 3 : Block Creeper explosion if has shield
    if (this.shouldProtectFromCreeperExplosionIfHasShield()) return;

    // Priority 4 : Eat if hunger bar is low
    if (this.shouldEatBehavior({ shouldEatAt: 6, ShouldEatUntil: 20 })) return;

    // Priority 5 : Get dropped item in range 5 form farming better
    if (this.getNearestDropedItemBehavior({ maxDistance: 5 })) return;

    // Priority 6 : attack nearest mob
    if (this.shouldAttackNearestMonsterMobs({ maxDistance: 5 })) return;

    // Priority 7 : Farm
    if (this.shouldFarmCropBehavior()) return;
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
    this.updateNameTag();
    // Recurent Check
    this.recurentsCheck();

    switch (this.forced_behavior) {
      case "default":
        this.defaultBehavior();
        break;
      case "crop_farming":
        this.cropFarmingBehavior();
    }
  }
}
