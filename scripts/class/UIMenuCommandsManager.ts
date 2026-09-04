import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { IMenuCommand, UIMenuCommands } from "../constants/UIMenuCommands";
import { Player } from "@minecraft/server";
import { debugLog } from "../functions";

export class UIMenuCommandsManager {
  static openMenu(player: Player, parent: IMenuCommand["parent"] = undefined, onReturn: Function | null = null) {
    let title: string;
    let description: string;

    const commands = UIMenuCommands.filter((command) => command.parent === parent);
    if (commands.length == 0) {
      const messageBoxForm = new MessageFormData();
      messageBoxForm.title({ translate: "global.mycompagnon:error" });
      messageBoxForm.body({ translate: "global.mycompagnon:error" });
      messageBoxForm.button1({ translate: "global.mycompagnon:back" });
      messageBoxForm.button2({ translate: "global.mycompagnon:close" });

      messageBoxForm.show(player).then((response) => {
        if (response.selection === 0) {
          if (onReturn) return onReturn();
        }
      });

      return;
    }

    title = parent ?? "Menu";

    const menuForm = new ActionFormData();
    menuForm.title(title);
    for (const command of commands) {
      menuForm.button({ translate: command.label });
    }

    menuForm.show(player).then((response) => {
      debugLog(`[UIMenuCommandsManager] ${player.name} selected ${response.selection}`);
    });
  }
}
