import { COMMANDS } from "../constants/Commands";
import { initCommands } from "../functions/initCommand";

initCommands({
  name: "help",
  desc: "command.mycompagnon:help_description",
  alias: ["h"],
  function: (args, player) => {
    if (args?.length > 0) {
      const command = args[0];
      const commandInfo = COMMANDS.find(
        (c) => c.name === command || c.alias?.includes(command),
      );

      if (commandInfo) {
        const aliases = commandInfo.alias?.length ? commandInfo.alias.join(", ") : undefined;

        return player.sendMessage({
          rawtext: [
            { text: `§7${commandInfo.name}§r\n§a` },
            { translate: commandInfo.desc ?? "command.mycompagnon:no_description" },
            { text: "\n§b" },
            { translate: "command.mycompagnon:aliases", with: [aliases ?? ""] },
          ],
        });
      } else {
        return player.sendMessage({ translate: "command.mycompagnon:unknown_command" });
      }
    } else {
      return player.sendMessage({
        translate: "command.mycompagnon:command_list",
        with: [COMMANDS.map((c) => c.name).join(", ")],
      });
    }
  },
});
