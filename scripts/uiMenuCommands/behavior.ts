import { ForcedBehavior } from "../class/CompagnonManager";
import { registerUIMenuCommand } from "../functions/registerUIMenuCommand.";

registerUIMenuCommand({
  label: "Behavior",
  description: "Update compagnon behavior",
  options: [
    {
      label: "behavior.default",
      value: "default",
    },
    {
      label: "behavior.follow_player",
      value: "follow_player",
    },
    {
      label: "crop_farming",
      value: "crop_farming",
    },
  ] as { label: string; value: ForcedBehavior }[],
  type: "select_many",
  callback: function (value: string): void {
    throw new Error("Function not implemented.");
  },
});
