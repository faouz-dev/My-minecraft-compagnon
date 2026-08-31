import { COMPAGNONS } from "../constants/Compagnons";
import { initCommands } from "../functions/initCommand";

const help_text =
  "§eUse Update Compagnon behavior.\n§7Use: §a.behavior <number>\n\n§f0 - §7default : follow player fight with mobs\n§f1 - §7only follow player\n§f2 - §7kills mobs for foods\n§f3 - §7farm in a champs";

initCommands({
  name: "behavior",
  desc: help_text,
  alias: ["b"],
  function: (arg, player) => {
    if (!COMPAGNONS.get(player.id))
      return player.sendMessage("§cYou don't have a compagnon");

    if (!arg || arg.length == 0) return player.sendMessage(help_text);
    const behavior = parseInt(arg[0]);
    if (isNaN(behavior)) return player.sendMessage(help_text);
    if (behavior < 0 || behavior > 3) return player.sendMessage(help_text);

    /**
     * @type {import("../class/CompagnonManager").ForcedBehavior}
     */
    let forced_behavior;
    switch (behavior) {
      case 0:
        forced_behavior = "default";
        break;
      case 1:
        forced_behavior = "follow_player";
        break;
      case 2:
        forced_behavior = "kill_mobs_for_food";
        break;
      case 3:
        forced_behavior = "farm_in_champs";
        break;
      default:
    }

    // @ts-ignore
    COMPAGNONS.get(player.id).updateBehavior(forced_behavior);
    return player.sendMessage("§cYour compagnon behavior have been updated");
  },
});
