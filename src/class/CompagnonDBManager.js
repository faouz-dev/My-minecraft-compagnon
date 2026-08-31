import { EntityComponentTypes, Player, world } from "@minecraft/server";
import { SimulatedPlayer } from "@minecraft/server-gametest";

/**
 * @typedef {Object} CompagnonProperty
 * @property {number} health
 * @property {string} name
 * @property {import("./CompagnonManager").ForcedBehavior} forced_behavior
 */

export class CompagnonDBManager {
  /**
   *
   * @param {Player} player
   * @param {Partial<CompagnonProperty>} property
   */
  static updateCompagnonData(player, property) {
    const currentProperty = CompagnonDBManager.getCompagnon(player) ?? {};

    Object.assign(currentProperty, property);

    world.setDynamicProperty(
      `compagnon_${player.id}`,
      JSON.stringify(currentProperty),
    );
  }

  /**
   * @param {Player} player
   *
   * @returns {boolean}
   */
  static hasCompagnon(player) {
    return world.getDynamicProperty(`compagnon_${player.id}`) !== undefined;
  }

  /**
   * @param {Player} player
   *
   * @returns {CompagnonProperty | undefined}
   */
  static getCompagnon(player) {
    return CompagnonDBManager.hasCompagnon(player)
      ? // @ts-ignore
        JSON.parse(world.getDynamicProperty(`compagnon_${player.id}`))
      : undefined;
  }

  /**
   *
   * @param {Player} player
   */
  static removeCompagnonData(player) {
    world.setDynamicProperty(`compagnon_${player.id}`, undefined);
  }

  /**
   * @param {Player} player
   * @param {SimulatedPlayer} compagnon
   */
  static createCompagnonData(player, compagnon) {
    CompagnonDBManager.updateCompagnonData(player, {
      name: compagnon.name,
      health: compagnon.getComponent(EntityComponentTypes.Health)?.currentValue,
      forced_behavior: "default",
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
