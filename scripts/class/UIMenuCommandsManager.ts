import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { IMenuCommand, UIMenuCommands } from "../constants/UIMenuCommands";
import { Player } from "@minecraft/server";
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

    const form = new ModalFormData().title({ translate: title });

    if (description) form.label({ translate: description });

    if (command.type === "select") {
      if (!command.options) return;

      const currentValue = command.currentValue?.(player, compagnon);
      const currentIndex = command.options.findIndex((option) => option.value === currentValue);

      form.divider().dropdown(
        { translate: "global.mycompagnon:select" },
        command.options.map((option) => ({
          translate: option.label,
        })),
        { defaultValueIndex: currentIndex >= 0 ? currentIndex : 0 }
      );
    } else if (command.type === "input") {
      form.textField(
        { translate: "global.mycompagnon:input" },
        { translate: "global.mycompagnon:input_placeholder" },
        { defaultValue: command.currentValue?.(player, compagnon) ?? "" }
      );
    } else {
      return;
    }

    form.submitButton({ translate: "global.mycompagnon:ok" });

    form
      .show(player)
      .then((response) => {
        if (response.canceled) {
          debugLog(`[UIMenuCommandsManager] ${player.name} canceled option menu`);

          if (onReturn) onReturn();
          return;
        }

        if (command.type === "input") {
          const value = response.formValues?.find((item): item is string => typeof item === "string");
          if (value === undefined) return;
          command.callback(player, compagnon, value);
          return;
        }

        const selectedIndex = response.formValues?.find((value): value is number => typeof value === "number");
        if (selectedIndex === undefined) return;

        const selectedOption = command.options?.[selectedIndex];
        if (!selectedOption) return;

        debugLog(`[UIMenuCommandsManager] ${player.name} selected ${selectedIndex}`);
        command.callback(player, compagnon, selectedOption.value);
      })
      .catch((error) => {
        debugLog(`[UIMenuCommandsManager] ${player.name} error: ${error}`);
      });
  }
}
