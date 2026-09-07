import { EntityComponentTypes, Player, world } from "@minecraft/server";
import { SimulatedPlayer } from "@minecraft/server-gametest";

export type SerializedVector3 = { x: number; y: number; z: number };

export type SerializedItem = {
  typeId: string;
  amount: number;
};

export type CompagnonProperty = {
  health: number;
  hunger: number;
  name: string;
  forced_behavior: import("./CompagnonManager").ForcedBehavior;
  location: SerializedVector3;
  dimension: string;
  cropFarmingData: {
    area?: {
      dimension: string;
      p1: SerializedVector3;
      p2: SerializedVector3;
    };
    chest?: {
      dimension: string;
      position: SerializedVector3;
    };
  };
  inventory: Array<SerializedItem | undefined>;
  equipment: Partial<Record<string, SerializedItem>>;
};

export class CompagnonDBManager {
  static updateCompagnonData(player: Player, property: Partial<CompagnonProperty>) {
    const currentProperty = CompagnonDBManager.getCompagnon(player) ?? {};

    Object.assign(currentProperty, property);

    world.setDynamicProperty(
      `compagnon_${player.id}`,
      JSON.stringify(currentProperty),
    );
  }

  static hasCompagnon(player: Player): boolean {
    return world.getDynamicProperty(`compagnon_${player.id}`) !== undefined;
  }

  static getCompagnon(player: Player): CompagnonProperty | undefined {
    return CompagnonDBManager.hasCompagnon(player)
      ? JSON.parse(world.getDynamicProperty(`compagnon_${player.id}`) as string)
      : undefined;
  }

  static removeCompagnonData(player: Player) {
    world.setDynamicProperty(`compagnon_${player.id}`, undefined);
  }

  static createCompagnonData(player: Player, compagnon: SimulatedPlayer) {
    CompagnonDBManager.updateCompagnonData(player, {
      name: compagnon.name,
      health: compagnon.getComponent(EntityComponentTypes.Health)?.currentValue,
      hunger: compagnon.getComponent(EntityComponentTypes.Hunger)?.currentValue,
      forced_behavior: "default",
      location: compagnon.location,
      dimension: compagnon.dimension.id,
      cropFarmingData: {},
      inventory: [],
      equipment: {},
    });
  }

  static getAllForExistingPlayer() {
    const players = world.getPlayers();
    const result = [];

    for (const player of players) {
      if (CompagnonDBManager.hasCompagnon(player)) {
        const data = CompagnonDBManager.getCompagnon(player);

        if (data) {
          result.push({ compagnon: data, player });
        }
      }
    }

    return result;
  }
}
