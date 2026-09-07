import { COMPAGNONS } from "../constants/Compagnons";
import { initCommands } from "../functions/initCommand";

initCommands({
  name: "name",
  desc: "Modifier le nom du compagnon",
  alias: ["n"],
  function: (args, player) => {
    const compagnon = COMPAGNONS.get(player.id);
    if (!compagnon) {
      player.sendMessage("§cVous n'avez pas de compagnon.");
      return;
    }

    const name = args.join(" ").trim();
    if (!name) {
      player.sendMessage("§eUtilisation : .name <nom>");
      return;
    }

    compagnon.updateName(name);
  },
});