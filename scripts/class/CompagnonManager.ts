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
  BlockStateType,
  BlockStates,
} from "@minecraft/server";
import { getPlayerSkin, LookDuration, SimulatedPlayer } from "@minecraft/server-gametest";
import { Vector2Utils, Vector3Utils } from "@minecraft/math";
import { debugLog } from "../functions/debugLog";
import { CompagnonDBManager, type CompagnonProperty, type SerializedItem } from "./CompagnonDBManager";
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
import {
  findSeedInChest,
  findSeedInInventory,
  PLANT_MAX_GROWTH,
  PLANTABLE_SEEDS,
} from "../functions/findSeedInInventory";
import { showSelectedArea } from "../functions/showSelectedArea";
import { lootAndBreakBlock } from "../functions/lootAndBreakBlock";

export type ForcedBehavior = "default" | "follow_player" | "mobs_farming" | "crop_farming";

type ClearOption = {
  clear?: boolean;
  filter?: never;
};

type FilterOption = {
  clear?: never;
  filter?: (item: ItemStack) => boolean;
};

type ShouldPutItemInContainerProps = {
  container: Block;
  warningState: ContainerWarningState;
} & (ClearOption | FilterOption);

type ContainerWarning = "none" | "cant_open" | "cant_access";

type ContainerWarningState = {
  value: ContainerWarning;
};

export class CompagnonManager {
  //=================================================
  // #region Variable Declaration
  //=================================================

  // compagnon configuration properties
  private behavior: string | null = null;
  private _forced_behavior: ForcedBehavior = "default";
  private shouldSleep: boolean = false;
  private compagnonName: string;

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
    area: {
      dimension: MinecraftDimensionTypes | undefined;
      waypoints: { p1: Vector3; p2: Vector3 } | undefined;
      warnNoAreaProvided: boolean;
      warnNoFarmLandInAreaSelected: boolean;
    };
    chest: {
      chestPosition: Vector3 | undefined;
      dimension: MinecraftDimensionTypes | undefined;
      chest: Block | undefined;
      avertissementMade: boolean;
      containerWarning: ContainerWarningState;
      isEmptyingInventory: boolean;
    };
  } = {
    area: {
      dimension: undefined,
      waypoints: undefined,
      warnNoAreaProvided: false,
      warnNoFarmLandInAreaSelected: false,
    },
    chest: {
      chestPosition: undefined,
      dimension: undefined,
      chest: undefined,
      avertissementMade: false,
      containerWarning: { value: "none" },
      isEmptyingInventory: false,
    },
  };

  private is_selecting_farm_area_datas: {
    p1: Vector3 | null;
    p1SelectedAt: number | null;
  } = { p1: null, p1SelectedAt: null };

  private lastPersistenceTick = 0;

  //=================================================
  // #endregion Variable Declaration
  //==================================================

  constructor(
    private readonly _compagnon: SimulatedPlayer,
    private readonly _owner: Player,
    name: string = _compagnon.name
  ) {
    this.compagnonName = name;
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
    const savedData = CompagnonDBManager.getCompagnon(this._owner);

    // Set Skin
    const playerSkin = getPlayerSkin(this._owner);
    this._compagnon.setSkin(playerSkin);
    debugLog(`[Config] - Compagnon skin set`);

    // Initialise Values
    this.mouvement_datas = {
      lastPosition: savedData?.location ?? this._compagnon.location,
      lastPositionTime: 0,
    };

    if (savedData) this.restorePersistentData(savedData);
  }

  private restorePersistentData(data: CompagnonProperty) {
    this._forced_behavior = data.forced_behavior ?? "default";

    if (data.location && data.dimension) {
      try {
        this._compagnon.teleport(data.location, { dimension: world.getDimension(data.dimension) });
      } catch (error) {
        debugLog(`[Config] - Could not restore compagnon location: ${error}`);
      }
    }

    const health = this._compagnon.getComponent(EntityComponentTypes.Health);
    if (health && typeof data.health === "number") health.setCurrentValue(data.health);

    const hunger = this._compagnon.getComponent(EntityComponentTypes.Hunger);
    if (hunger && typeof data.hunger === "number") hunger.setCurrentValue(data.hunger);

    const inventory = this.getInventoryComponent().container;
    for (let slot = 0; slot < inventory.size; slot++) {
      const serializedItem = data.inventory?.[slot];
      inventory.setItem(slot, serializedItem ? this.deserializeItem(serializedItem) : undefined);
    }

    const equipable = this.getEquipableComponent();
    for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
      const serializedItem = data.equipment?.[slot];
      equipable.setEquipment(slot, serializedItem ? this.deserializeItem(serializedItem) : undefined);
    }

    const savedCropData = data.cropFarmingData;
    if (savedCropData?.area) {
      this.crop_farming_behavior_data.area = {
        dimension: savedCropData.area.dimension as MinecraftDimensionTypes,
        waypoints: { p1: savedCropData.area.p1, p2: savedCropData.area.p2 },
        warnNoAreaProvided: false,
        warnNoFarmLandInAreaSelected: false,
      };
    }

    if (savedCropData?.chest) {
      const dimension = world.getDimension(savedCropData.chest.dimension);
      const chest = dimension.getBlock(savedCropData.chest.position);
      this.crop_farming_behavior_data.chest = {
        chestPosition: savedCropData.chest.position,
        dimension: savedCropData.chest.dimension as MinecraftDimensionTypes,
        chest: chest?.typeId === MinecraftBlockTypes.Chest ? chest : undefined,
        avertissementMade: false,
        containerWarning: { value: "none" },
        isEmptyingInventory: false,
      };
    }
  }

  private serializeItem(item: ItemStack | undefined): SerializedItem | undefined {
    if (!item) return undefined;
    return { typeId: item.typeId, amount: item.amount };
  }

  private deserializeItem(item: SerializedItem): ItemStack {
    return new ItemStack(item.typeId, item.amount);
  }

  public savePersistentData() {
    const inventory = this.getInventoryComponent().container;
    const equipment: Partial<Record<string, SerializedItem>> = {};
    const equipable = this.getEquipableComponent();

    for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
      const item = this.serializeItem(equipable.getEquipment(slot));
      if (item) equipment[slot] = item;
    }

    const area = this.crop_farming_behavior_data.area;
    const chest = this.crop_farming_behavior_data.chest;
    const cropFarmingData: CompagnonProperty["cropFarmingData"] = {};

    if (area.dimension && area.waypoints) {
      cropFarmingData.area = {
        dimension: area.dimension,
        p1: area.waypoints.p1,
        p2: area.waypoints.p2,
      };
    }

    if (chest.chestPosition && chest.dimension) {
      cropFarmingData.chest = {
        dimension: chest.dimension,
        position: chest.chestPosition,
      };
    }

    CompagnonDBManager.updateCompagnonData(this._owner, {
      name: this.compagnonName,
      health: this._compagnon.getComponent(EntityComponentTypes.Health)?.currentValue,
      hunger: this._compagnon.getComponent(EntityComponentTypes.Hunger)?.currentValue,
      forced_behavior: this._forced_behavior,
      location: this._compagnon.location,
      dimension: this._compagnon.dimension.id,
      cropFarmingData,
      inventory: Array.from({ length: inventory.size }, (_, slot) => this.serializeItem(inventory.getItem(slot))),
      equipment,
    });
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

  updateName(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    this.compagnonName = trimmedName;
    CompagnonDBManager.updateCompagnonData(this._owner, { name: trimmedName });
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

    const hotbarConfiguration: ItemPurpose[] = ["combat", "woodcutting", "mining", "farming"] as ItemPurpose[];

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

  private updateNameTag() {
    const health = this._compagnon.getComponent(EntityComponentTypes.Health)!.currentValue;

    const hearts = Math.round(health / 2);

    this._compagnon.nameTag =
      `§l§f${this.compagnonName}§r\n` + `§c❤ §f${hearts} §7HP§r\n` + `§8✦ owner : §f${this._owner.name}`;
  }

  /**
   * @description - this function is called when the staff of autority is used on block to verify if it's selecting farm area
   */
  public isSelectingFarmArea(block: Block): boolean {
    if (this.forced_behavior !== "crop_farming") return false;
    debugLog("[isFarmAreaSelected] - Compagnon is in farm area selection mode");

    if (block.type.id === MinecraftBlockTypes.Chest) {
      debugLog("[isFarmAreaSelected] - Compagnon is selecting chest");
      this.crop_farming_behavior_data.chest = {
        chestPosition: block.location,
        dimension: block.dimension.id as MinecraftDimensionTypes,
        chest: block,
        avertissementMade: false,
        containerWarning: { value: "none" },
        isEmptyingInventory: false,
      };
      this.savePersistentData();
      this.tellOwner("message.mycompagnon:compagnon.noticed_the_chest");
    } else {
      if (
        this.is_selecting_farm_area_datas.p1 &&
        this.is_selecting_farm_area_datas.p1SelectedAt !== null &&
        system.currentTick - this.is_selecting_farm_area_datas.p1SelectedAt > 60 * 20
      ) {
        debugLog("[isFarmAreaSelected] - First point selection expired");
        this.is_selecting_farm_area_datas = { p1: null, p1SelectedAt: null };
        this.savePersistentData();
      }

      if (this.is_selecting_farm_area_datas.p1) {
        debugLog("[isFarmAreaSelected] - Compagnon is selecting p2");
        // Reset farming behavior datas
        this.crop_farming_behavior_data.area = {
          dimension: this._owner.dimension.id as MinecraftDimensionTypes,
          waypoints: { p1: this.is_selecting_farm_area_datas.p1!, p2: block.location },
          warnNoAreaProvided: false,
          warnNoFarmLandInAreaSelected: false,
        };
        showSelectedArea(
          this.crop_farming_behavior_data.area.waypoints!.p1,
          this.crop_farming_behavior_data.area.waypoints!.p2,
          40,
          world.getDimension(this.crop_farming_behavior_data.area.dimension!)
        );

        this.is_selecting_farm_area_datas = { p1: null, p1SelectedAt: null };

        debugLog("[isFarmAreaSelected] -Farm area selected");
      } else {
        this.is_selecting_farm_area_datas.p1 = block.location;
        this.is_selecting_farm_area_datas.p1SelectedAt = system.currentTick;
        this._owner.dimension.spawnParticle("minecraft:endrod", {
          x: block.location.x + 0.5,
          y: block.location.y + 1.25,
          z: block.location.z + 0.5,
        });
        this.savePersistentData();
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
          this._owner.sendMessage({ translate: "message.mycompagnon:compagnon.no_bed_found" });
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
  private getNearestDropedItemBehavior(
    options: Pick<EntityQueryOptions, "maxDistance"> = { maxDistance: 2 },
    move?: boolean
  ): boolean {
    // Priority 1 - check if bro's inventory is not full
    const container = this.getInventoryComponent();
    if (container.container.emptySlotsCount == 0) {
      debugLog("[GetNearestDropedItemBehavior] - Compagnon inventory is full");
      return false;
    }

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
    if (move) {
      this._compagnon.moveToLocation(this.target_item.location);
    } else {
      this._compagnon.navigateToEntity(this.target_item);
    }
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

  private shouldPutItemIntoContainer(props: ShouldPutItemInContainerProps) {
    const { container, warningState } = props;

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
        const blockAtTop = possibleChest.above();
        if (blockAtTop && blockAtTop.typeId !== MinecraftBlockTypes.Air) {
          debugLog("[ShouldPutItemIntoContainer] - Container is not accessible");
          if (warningState.value !== "cant_open") {
            this.tellOwner("message.mycompagnon:compagnon.cant_open_container");
            warningState.value = "cant_open";
          }
          return false;
        }
      }
      SpawnAt = container.location;
    }

    if (!SpawnAt) {
      debugLog("[ShouldPutItemIntoContainer] - No place to access the chest");
      if (warningState.value !== "cant_access") {
        this.tellOwner("message.mycompagnon:compagnon.cant_access_container");
        warningState.value = "cant_access";
      }
      return false;
    }

    warningState.value = "none";

    // Verify if container is Empty
    if (inventoryComponent.container!.emptySlotsCount == 0) {
      debugLog("[ShouldPutItemIntoContainer] - Container is not empty");
      this.crop_farming_behavior_data.chest.isEmptyingInventory = false;
      return false;
    }

    debugLog("[ShouldPutItemIntoContainer] - moving to Container");

    // try teleport to point
    this._compagnon.tryTeleport(SpawnAt);

    this._compagnon.lookAtBlock(container, LookDuration.UntilMove);
    this._compagnon.interactWithBlock(container);

    if (props.clear) {
      const firstItem = this.getInventoryComponent().container.firstItem();
      if (firstItem !== undefined) {
        debugLog("[ShouldPutItemIntoContainer] - putting item  " + firstItem + " in container");
        this.getInventoryComponent().container.transferItem(firstItem, inventoryComponent.container!);
      }
    } else {
      let firstTransferableItemSlot: number | null = null;
      for (let i = 4; i < this.getInventoryComponent().container.size; i++) {
        const existsItem = this.getInventoryComponent().container.getItem(i);
        if (existsItem !== undefined) {
          if (props.filter && props.filter(existsItem)) {
            firstTransferableItemSlot = i;
            break;
          } else if (!props.filter) {
            firstTransferableItemSlot = i;
            break;
          }
        }
      }

      if (firstTransferableItemSlot !== null) {
        debugLog("[ShouldPutItemIntoContainer] - putting item  " + firstTransferableItemSlot + " in container");
        this.getInventoryComponent().container.transferItem(firstTransferableItemSlot, inventoryComponent.container!);
        this.crop_farming_behavior_data.chest.isEmptyingInventory = true;
      } else {
        this.crop_farming_behavior_data.chest.isEmptyingInventory = false;
      }
    }

    return true;
  }

  private shouldFarmCropBehavior(): boolean {
    const { area, chest } = this.crop_farming_behavior_data;

    // Case farming area in zone
    if (!area || !area.dimension || !area.waypoints) {
      if (!area!.warnNoAreaProvided) {
        this.tellOwner("message.mycompagnon:compagnon.no_farm_area_selected");
        area!.warnNoAreaProvided = true;
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
        this.crop_farming_behavior_data.area = {
          ...area,
          warnNoFarmLandInAreaSelected: true,
        };
      }
    }
    const compagnonContainer = this.getInventoryComponent();
    // Priority 1 : put farmedItemInInventory
    if (chest.chest && (compagnonContainer.container.emptySlotsCount == 0 || chest.isEmptyingInventory)) {
      const shouldPutItemInChest = this.shouldPutItemIntoContainer({
        filter: (item) => {
          return !PLANTABLE_SEEDS.has(item.typeId);
        },
        container: chest.chest,
        warningState: chest.containerWarning,
      });
      return true;
    }

    // Priority 2 : put searchForSeed

    const seedExist = findSeedInInventory(compagnonContainer);
    if (!seedExist) {
      debugLog("[ShouldFarmCrop] - No seed found in inventory");
    } else {
      debugLog("[ShouldFarmCrop] - Seed found in inventory : " + seedExist.item.typeId + " at slot " + seedExist.slot);
    }

    // priority 3 : put crop in Empty Farmland
    const emptyFarmLand: Block[] = [];
    const plants: Block[] = [];
    for (const blockPosition of farmableLandsInArea.getBlockLocationIterator()) {
      const block = world.getDimension(area.dimension).getBlock(blockPosition);
      if (block && block.above()?.typeId == MinecraftBlockTypes.Air) {
        emptyFarmLand.push(block);
      } else if (block && block.above() && block.above()!.typeId != MinecraftBlockTypes.Air) {
        plants.push(block.above()!);
      }
    }

    // Priority 3 : put crop in Empty Farmland
    if (emptyFarmLand.length > 0 && seedExist) {
      debugLog("[ShouldFarmCrop] - Empty Farmland found : " + emptyFarmLand.length);

      emptyFarmLand.sort((a, b) => this.nearestFromCompagnon(a.location, b.location));
      const block = emptyFarmLand[0];
      const distance = Vector3Utils.distance(this._compagnon.location, block.location);

      if (distance <= 3) {
        this._compagnon.stopMoving();
        this.compagnon.lookAtBlock(block, LookDuration.Instant);

        // On utilise directement l'item et le slot renvoyés par seedExist
        const { item: seed, slot } = seedExist;

        // Utilisation directe avec la face supérieure
        const success = this._compagnon.useItemOnBlock(seed, block.location);

        if (success) {
          debugLog("[ShouldFarmCrop] - Seed planted successfully at slot " + slot);

          // Mise à jour de la quantité directement dans son slot d'origine
          if (seed.amount > 1) {
            compagnonContainer.container.setItem(slot, new ItemStack(seed.type, seed.amount - 1));
          } else {
            compagnonContainer.container.setItem(slot, undefined);
          }
        }
      } else {
        debugLog("[ShouldFarmCrop] - Moving to farmland...");
        this.compagnon.moveToBlock(block.location, { speed: 1 });
        this.compagnon.lookAtBlock(block, LookDuration.Instant);
      }

      return true;
    }

    // Priority 4 : recolte if there are some seedGrowwed
    if (plants.length > 0) {
      debugLog("[ShouldFarmCrop] - Not Empty Farmland found : " + plants.length);
      const maxGrowedPlant = plants
        .filter((plant) => {
          const growth = plant.permutation.getState("growth");
          if (
            growth !== undefined &&
            PLANT_MAX_GROWTH.get(plant.typeId) &&
            growth >= PLANT_MAX_GROWTH.get(plant.typeId)!
          ) {
            return true;
          } else {
            return false;
          }
        })
        .sort((a, b) => this.nearestFromCompagnon(a.location, b.location));

      if (maxGrowedPlant.length > 0) {
        const block = maxGrowedPlant[0];
        if (Vector3Utils.distance(this._compagnon.location, block.location) <= 3) {
          this._compagnon.stopMoving();
          this.compagnon.lookAtBlock(block, LookDuration.Instant);
          this.compagnon.selectedSlotIndex = 3;
          const success = lootAndBreakBlock(block);
          if (success) {
            debugLog("[ShouldFarmCrop] - Crop Recolted");
          }
        } else {
          this.compagnon.moveToBlock(block.location, { speed: 1 });
          this.compagnon.lookAtBlock(block, LookDuration.Instant);
        }
      }

      return true;
    }

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
    if (this.getNearestDropedItemBehavior({ maxDistance: 5 }, true)) return;

    // Priority 6 : attack nearest mob
    if (this.shouldAttackNearestMonsterMobs({ maxDistance: 5 })) return;

    // Priority 7 : Farm
    if (this.shouldFarmCropBehavior()) return;
  }

  // ====================================================================
  //                    Full behavior management
  // ====================================================================

  compagnonBehavior() {
    this.updateNameTag();
    if (system.currentTick - this.lastPersistenceTick >= 20) {
      this.savePersistentData();
      this.lastPersistenceTick = system.currentTick;
    }
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
