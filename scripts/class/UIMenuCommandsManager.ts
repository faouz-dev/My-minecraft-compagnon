import {
  ActionFormData,
  CustomForm,
  DataDrivenScreenClosedReason,
  DropdownItemData,
  MessageFormData,
  ModalFormData,
  ObservableNumber,
} from "@minecraft/server-ui";
import { IMenuCommand, UIMenuCommands } from "../constants/UIMenuCommands";
import { Player, SetDataFromColorIndexFunction } from "@minecraft/server";
import { debugLog } from "../functions";
import { CompagnonManager } from "./CompagnonManager";

export class UIMenuCommandsManager {
  static openMenu(
    player: Player,
    compagnon: CompagnonManager,
    parent: IMenuCommand["parent"] = undefined,
    onReturn: Function | null = null
  ) {
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

    title = parent ?? "global.mycompagnon:compagnon_menu";

    const menuForm = new ActionFormData();
    menuForm.title({ translate: title });
    for (const command of commands) {
      menuForm.button({ translate: command.label });
    }

    menuForm.show(player).then((response) => {
      if (response.canceled) {
        debugLog(`[UIMenuCommandsManager] ${player.name} canceled`);
        return;
      }
      debugLog(`[UIMenuCommandsManager] ${player.name} selected ${response.selection}`);
      const uicommand = commands[response.selection!];
      debugLog(`[UIMenuCommandsManager] ${player.name} command ${uicommand.label}`);
      this.openOption(player, compagnon, uicommand, () => this.openMenu(player, compagnon, parent, onReturn));
    });
  }

  static openOption(
    player: Player,
    compagnon: CompagnonManager,
    command: IMenuCommand,
    onReturn: (() => void) | null = null
  ) {
    const title = command.label;
    const description = command.description;

    if (command.type !== "select" || !command.options) return;

    const form = new ModalFormData()
      .title({ translate: title })
      .label({ translate: description })
      .divider()
      .dropdown(
        { translate: "global.mycompagnon:select" },
        command.options.map((option) => ({
          translate: option.label,
        }))
      )
      .submitButton({ translate: "global.mycompagnon:ok" });

    form
      .show(player)
      .then((response) => {
        if (response.canceled) {
          debugLog(`[UIMenuCommandsManager] ${player.name} canceled option menu`);

          if (onReturn) onReturn();
          return;
        }

        /*
         * On cherche la valeur numérique plutôt que d'utiliser
         * directement formValues[0].
         *
         * ModalFormData peut maintenant contenir label/header/divider,
         * dont les valeurs de réponse peuvent être undefined.
         */
        const selectedIndex = response.formValues?.find((value): value is number => typeof value === "number");

        if (selectedIndex === undefined) {
          debugLog(`[UIMenuCommandsManager] ${player.name} no option selected`);
          return;
        }

        const selectedOption = command.options![selectedIndex];

        if (!selectedOption) return;

        debugLog(`[UIMenuCommandsManager] ${player.name} selected ${selectedIndex}`);

        command.callback(player, compagnon, selectedOption.value);
      })
      .catch((error) => {
        debugLog(`[UIMenuCommandsManager] ${player.name} error: ${error}`);
      });
  }
}
