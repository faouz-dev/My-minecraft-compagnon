import { Player } from "@minecraft/server";
import { CompagnonManager, ForcedBehavior } from "../class/CompagnonManager";
import { registerUIMenuCommand } from "../functions/registerUIMenuCommand.";

registerUIMenuCommand({
  label: "behavior.mycompagnon:menu",
  description: "behavior.mycompagnon:description",
  options: [
    {
      label: "behavior.mycompagnon:default",
      value: "default",
    },
    {
      label: "behavior.mycompagnon:follow_player",
      value: "follow_player",
    },
    {
      label: "behavior.mycompagnon:crop_farming",
      value: "crop_farming",
    },
  ] as { label: string; value: ForcedBehavior }[],
  type: "select",
  callback: function (player: Player, compagnon: CompagnonManager, value: unknown): void {
    compagnon.updateBehavior(value as ForcedBehavior);
  },
});
