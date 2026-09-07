import { COMPAGNONS } from "../constants/Compagnons";
import { initCommands } from "../functions/initCommand";

initCommands({
  name: "name",
  desc: "command.mycompagnon:name_description",
  alias: ["n"],
  function: (args, player) => {
    const compagnon = COMPAGNONS.get(player.id);
    if (!compagnon) {
      player.sendMessage({ translate: "message.mycompagnon:staff_of_authority.dont_have_compagnon" });
      return;
    }

    const name = args.join(" ").trim();
    if (!name) {
      player.sendMessage({ translate: "command.mycompagnon:name_usage" });
      return;
    }

    compagnon.updateName(name);
  },
});