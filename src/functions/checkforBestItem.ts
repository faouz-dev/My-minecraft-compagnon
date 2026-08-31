import { Container, EquipmentSlot, ItemStack } from "@minecraft/server";

/**
 * Les différents usages possibles pour le Mainhand.
 */
export type ItemPurpose = "combat" | "mining" | "woodcutting" | "farming";

/**
 * Score de puissance des équipements.
 *
 * Plus le score est élevé, meilleur est l'équipement.
 *
 * Pour le Mainhand, les scores sont séparés par usage afin de
 * permettre de choisir l'outil le plus adapté à la tâche.
 *
 *
 */
const EQUIPMENT_SCORES = {
  [EquipmentSlot.Head]: {
    "minecraft:leather_helmet": 10,
    "minecraft:golden_helmet": 15,
    "minecraft:chainmail_helmet": 20,
    "minecraft:iron_helmet": 25,
    "minecraft:diamond_helmet": 40,
    "minecraft:netherite_helmet": 50,
  },

  [EquipmentSlot.Chest]: {
    "minecraft:leather_chestplate": 15,
    "minecraft:golden_chestplate": 25,
    "minecraft:chainmail_chestplate": 35,
    "minecraft:iron_chestplate": 45,
    "minecraft:diamond_chestplate": 70,
    "minecraft:netherite_chestplate": 80,
  },

  [EquipmentSlot.Legs]: {
    "minecraft:leather_leggings": 12,
    "minecraft:golden_leggings": 20,
    "minecraft:chainmail_leggings": 30,
    "minecraft:iron_leggings": 40,
    "minecraft:diamond_leggings": 60,
    "minecraft:netherite_leggings": 70,
  },

  [EquipmentSlot.Feet]: {
    "minecraft:leather_boots": 8,
    "minecraft:golden_boots": 12,
    "minecraft:chainmail_boots": 18,
    "minecraft:iron_boots": 22,
    "minecraft:diamond_boots": 35,
    "minecraft:netherite_boots": 40,
  },

  [EquipmentSlot.Mainhand]: {
    combat: {
      // Épées
      "minecraft:wooden_sword": 10,
      "minecraft:stone_sword": 18,
      "minecraft:golden_sword": 20,
      "minecraft:iron_sword": 30,
      "minecraft:diamond_sword": 50,
      "minecraft:netherite_sword": 60,

      // Haches
      "minecraft:wooden_axe": 12,
      "minecraft:stone_axe": 20,
      "minecraft:golden_axe": 22,
      "minecraft:iron_axe": 35,
      "minecraft:diamond_axe": 55,
      "minecraft:netherite_axe": 65,

      // Armes à distance
      "minecraft:bow": 40,
      "minecraft:crossbow": 45,
      "minecraft:trident": 50,
    },

    mining: {
      "minecraft:wooden_pickaxe": 10,
      "minecraft:stone_pickaxe": 20,
      "minecraft:golden_pickaxe": 15,
      "minecraft:iron_pickaxe": 35,
      "minecraft:diamond_pickaxe": 60,
      "minecraft:netherite_pickaxe": 70,
    },

    woodcutting: {
      "minecraft:wooden_axe": 10,
      "minecraft:stone_axe": 20,
      "minecraft:golden_axe": 15,
      "minecraft:iron_axe": 35,
      "minecraft:diamond_axe": 60,
      "minecraft:netherite_axe": 70,
    },

    farming: {
      "minecraft:wooden_hoe": 10,
      "minecraft:stone_hoe": 20,
      "minecraft:golden_hoe": 15,
      "minecraft:iron_hoe": 35,
      "minecraft:diamond_hoe": 60,
      "minecraft:netherite_hoe": 70,
    },
  },

  [EquipmentSlot.Offhand]: {
    "minecraft:shield": 50,
    "minecraft:totem_of_undying": 100,
  },
};

/**
 * Retourne le meilleur objet disponible dans l'inventaire
 * pour un slot d'équipement et un usage donné.
 */
export function checkforBestItem(
  currentItem: ItemStack | undefined,
  inventory: Container,
  slot: EquipmentSlot,
  purpose: ItemPurpose = "combat",
): {
  shouldChange: boolean;
  currentItem?: ItemStack;
  bestItem?: ItemStack;
  index?: number;
} {
  // @ts-ignore
  let scores = EQUIPMENT_SCORES[slot];

  if (!scores) {
    return {
      shouldChange: false,
      currentItem,
    };
  }

  // Le Mainhand possède plusieurs catégories d'utilisation.
  if (slot === EquipmentSlot.Mainhand) {
    //@ts-expect-error
    scores = scores[purpose];

    if (!scores) {
      return {
        shouldChange: false,
        currentItem,
      };
    }
  }

  //@ts-expect-error
  const currentScore = currentItem ? (scores[currentItem.typeId] ?? 0) : 0;

  let bestItem = currentItem;
  let bestScore = currentScore;
  let index;

  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);

    if (!item) continue;

    //@ts-expect-error
    const score = scores[item.typeId];

    if (score === undefined) continue;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
      index = i;
    }
  }

  return {
    shouldChange: bestItem?.typeId !== currentItem?.typeId,
    currentItem,
    bestItem,
    index,
  };
}
