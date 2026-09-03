import { world } from "@minecraft/server";
import { COMMANDS } from "../constants/Commands";
import { debugLog } from "../functions/debugLog";

world.beforeEvents.chatSend.subscribe((event) => {
  const { sender, message } = event;

  if (message.trim().startsWith(".")) {
    event.cancel = true;

    const text = message.trim().replace(".", "");
    const parts = text.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    const existCommand = COMMANDS.find(
      (c) => c.name === command || c.alias?.includes(command),
    );

    if (existCommand) {
      debugLog(
        "commande executions: " + existCommand.name + " " + args.join(","),
      );

      existCommand.function(args, sender);
    } else {
      sender.sendMessage("unknown command");
    }
  }
});
