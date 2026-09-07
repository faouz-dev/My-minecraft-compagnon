

import { ForcedBehavior } from "../class/CompagnonManager";
import { COMPAGNONS } from "../constants/Compagnons";
import { initCommands } from "../functions/initCommand";

const availableBehaviors: ForcedBehavior[] = ["default", "crop_farming"];
const behaviorByIndex: Record<string, ForcedBehavior> = {
  "0": "default",
  "1": "crop_farming",
};

initCommands({
	name: "behavior",
	desc: "command.mycompagnon:behavior_description",
	alias: ["b"],
	function: (args, player) => {
		const compagnon = COMPAGNONS.get(player.id);
		if (!compagnon) {
			player.sendMessage({ translate: "message.mycompagnon:staff_of_authority.dont_have_compagnon" });
			return;
		}

		const behavior = behaviorByIndex[args[0] ?? ""] ?? (args[0] as ForcedBehavior | undefined);
		if (!behavior || !availableBehaviors.includes(behavior)) {
			player.sendMessage({ translate: "command.mycompagnon:behavior_usage" });
			return;
		}

		compagnon.updateBehavior(behavior);
	},
});
