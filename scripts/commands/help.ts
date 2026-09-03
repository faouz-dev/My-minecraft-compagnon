import { COMMANDS } from "../constants/Commands";
import { initCommands } from "../functions/initCommand";

initCommands({
  name: "help",
  desc: "Help command",
  alias: ["h"],
  function: (args, player) => {
    if (args?.length > 0) {
      const command = args[0];
      const commandInfo = COMMANDS.find(
        (c) => c.name === command || c.alias?.includes(command),
      );

      if (commandInfo) {
        const aliases = commandInfo.alias?.length
          ? commandInfo.alias.join(", ")
          : "none";

        return player.sendMessage(
          `§7Command §e${commandInfo.name}§7 :\n` +
            `§aDescription §r: ${commandInfo.desc}\n` +
            `§bAliases §r: ${aliases}\n`,
        );
      } else {
        return player.sendMessage("§cUnkown command");
      }
    } else {
      return player.sendMessage(
        `§7Commandes list :\n` +
          COMMANDS.map((c) => `§e${c.name}§7`).join(", "),
      );
    }
  },
});
