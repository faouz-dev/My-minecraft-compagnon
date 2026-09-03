import { Block } from "@minecraft/server";
import type { BedStates } from "@minecraft/vanilla-data";
import { debugLog } from "./debugLog";

export function isBedOccupied(block: Block): boolean {
  const isHead = block.permutation.getState<keyof BedStates>("head_piece_bit");

  // Déjà sur la tête
  if (isHead === true) {
    debugLog("[isBedOccupied] we found head");
    return block.permutation.getState<keyof BedStates>("occupied_bit") === true;
  }

  // On est sur le pied : retrouver la tête
  const direction = block.permutation.getState<keyof BedStates>("direction");
  debugLog(`[isBedOccupied] direction: ${direction}`);

  let headLocation = { ...block.location };

  switch (direction) {
    case 0:
      headLocation.z += 1;
      break;
    case 1:
      headLocation.x -= 1;
      break;
    case 2:
      headLocation.z -= 1;
      break;
    case 3:
      headLocation.x += 1;
      break;
  }

  const head = block.dimension.getBlock(headLocation);

  if (!head) return false;
  if (head.permutation.getState<keyof BedStates>("head_piece_bit") !== true) {
    debugLog("[isBedOccupied] head not found with direction search");
    return false;
  }
  debugLog("[isBedOccupied] head found");
  return head.permutation.getState<keyof BedStates>("occupied_bit") === true;
}
