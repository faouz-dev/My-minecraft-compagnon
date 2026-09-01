import { Container, ItemStack } from "@minecraft/server";

/**
 * Scores d'efficacité de la nourriture (Points de faim + Saturation).
 * Plus le score est élevé, plus l'aliment remplit la barre efficacement.
 */
export const FOOD_SCORES = {
  // --- Excellents (Score 60+) ---
  "minecraft:enchanted_golden_apple": 100, // Optionnel (Golden)
  "minecraft:golden_apple": 90, // Optionnel (Golden)
  "minecraft:golden_carrot": 85,
  "minecraft:cooked_beef": 80, // Steak
  "minecraft:cooked_porkchop": 80,
  "minecraft:pumpkin_pie": 70,

  // --- Bons (Score 40-59) ---
  "minecraft:cooked_mutton": 60,
  "minecraft:cooked_salmon": 60,
  "minecraft:cooked_chicken": 55,
  "minecraft:cooked_rabbit": 55,
  "minecraft:rabbit_stew": 55,
  "minecraft:bread": 50,
  "minecraft:baked_potato": 45,
  "minecraft:cooked_cod": 45,

  // --- Moyens / Snacks (Score 20-39) ---
  "minecraft:mushroom_stew": 35,
  "minecraft:beetroot_soup": 35,
  "minecraft:suspicious_stew": 35,
  "minecraft:apple": 30,
  "minecraft:carrot": 30,
  "minecraft:honey_bottle": 25,
  "minecraft:cookie": 20,
  "minecraft:melon_slice": 15,

  // --- Faibles ou Toxiques (Score < 20) ---
  "minecraft:sweet_berries": 10,
  "minecraft:glow_berries": 10,
  "minecraft:dried_kelp": 8,
  "minecraft:raw_beef": 5,
  "minecraft:porkchop": 5,
  "minecraft:mutton": 5,
  "minecraft:chicken": 4, // Risque de faim
  "minecraft:rotten_flesh": 3, // Toxique (Optionnel)
  "minecraft:spider_eye": 2, // Toxique (Optionnel)
  "minecraft:poisonous_potato": 1, // Toxique (Optionnel)
  "minecraft:pufferfish": 0, // Toxique (Optionnel)
};

/**
 * Liste des pommes dorées pour le filtrage
 */
const GOLDEN_ITEMS = [
  "minecraft:golden_apple",
  "minecraft:enchanted_golden_apple",
];

/**
 * Liste des aliments à effets négatifs/poison
 */
const NEGATIVE_ITEMS = [
  "minecraft:rotten_flesh",
  "minecraft:spider_eye",
  "minecraft:poisonous_potato",
  "minecraft:pufferfish",
  "minecraft:chicken",
];

/**
 * Retourne le meilleur aliment disponible dans l'inventaire.
 *
 * @param {Container} inventory - L'inventaire du joueur
 * @param {boolean} includeGolden - Autoriser l'utilisation des pommes dorées
 * @param {boolean} includeNegative - Autoriser la nourriture périmée/toxique si rien d'autre
 */
export function checkForBestFood(
  inventory: Container,
  includeGolden: boolean = false,
  includeNegative: boolean = false,
): {
  foundFood: boolean;
  bestItem?: ItemStack;
  slotIndex?: number;
  score: number;
} {
  let bestItem: ItemStack | undefined = undefined;
  let bestScore = -1;
  let slotIndex: number | undefined = undefined;

  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (!item) continue;

    // Récupère le score de l'item
    // @ts-ignore
    const score = FOOD_SCORES[item.typeId];
    if (score === undefined) continue;

    // Filtre 1 : Ignorer les pommes dorées si demandé
    if (!includeGolden && GOLDEN_ITEMS.includes(item.typeId)) {
      continue;
    }

    // Filtre 2 : Ignorer la nourriture toxique si demandé
    if (!includeNegative && NEGATIVE_ITEMS.includes(item.typeId)) {
      continue;
    }

    // Sélection de la nourriture avec le plus haut score
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
      slotIndex = i;
    }
  }

  return {
    foundFood: bestItem !== undefined,
    bestItem,
    slotIndex,
    score: bestScore,
  };
}
