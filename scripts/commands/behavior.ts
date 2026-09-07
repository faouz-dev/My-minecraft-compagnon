

import { ForcedBehavior } from "../class/CompagnonManager";
import { COMPAGNONS } from "../constants/Compagnons";
import { initCommands } from "../functions/initCommand";

const availableBehaviors: ForcedBehavior[] = ["default", "crop_farming"];

initCommands({
	name: "behavior",
	desc: "Modifier le comportement du compagnon",
	alias: ["b"],
	function: (args, player) => {
		const compagnon = COMPAGNONS.get(player.id);
		if (!compagnon) {
			player.sendMessage("§cVous n'avez pas de compagnon.");
			return;
		}

		const behavior = args[0] as ForcedBehavior | undefined;
		if (!behavior || !availableBehaviors.includes(behavior)) {
			player.sendMessage(`§eComportements disponibles : ${availableBehaviors.join(", ")}`);
			return;
		}

		compagnon.updateBehavior(behavior);
	},
});
