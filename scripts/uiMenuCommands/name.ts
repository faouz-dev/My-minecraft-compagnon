import { Player } from "@minecraft/server";
import { CompagnonManager } from "../class/CompagnonManager";
import { registerUIMenuCommand } from "../functions/registerUIMenuCommand.";

registerUIMenuCommand({
  label: "name.mycompagnon:menu",
  description: "name.mycompagnon:description",
  type: "input",
  currentValue: (_player: Player, compagnon: CompagnonManager) => compagnon.compagnon.name,
  callback: (_player: Player, compagnon: CompagnonManager, value: string) => {
    compagnon.updateName(value);
  },
});