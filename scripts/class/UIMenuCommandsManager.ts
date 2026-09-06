import {
  ActionFormData,
  CustomForm,
  DataDrivenScreenClosedReason,
  DropdownItemData,
  MessageFormData,
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

    const customForm = new CustomForm(player, { translate: title });
    customForm.label({ translate: description });
    customForm.spacer();

    if (command.type == "select") {
      const value = new ObservableNumber(0, { clientWritable: true });
      const dropDownItem: DropdownItemData[] = command.options!.map((option, i) => ({
        label: { translate: option.label },
        value: i,
      }));

      customForm.dropdown({ translate: "global.mycompagnon:select" }, value, dropDownItem);
      customForm.button({ translate: "global.mycompagnon:ok" }, () => {
        customForm.close();
        debugLog(`[UIMenuCommandsManager] ${player.name} selected ${value.getData()}`);
        command.callback(player, compagnon, command.options![value.getData()]!.value);
      });
      customForm.divider();
      if (onReturn)
        customForm.button({ translate: "global.mycompagnon:back" }, () => {
          customForm.close();
          onReturn();
        });
      customForm.closeButton();
      customForm.show().then((err) => {
        if (err) {
          debugLog(`[UIMenuCommandsManager] ${player.name} error: ${err}`);
          return;
        }
      });
    }
  }
}
