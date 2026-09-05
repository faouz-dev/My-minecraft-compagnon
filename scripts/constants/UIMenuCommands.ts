import { Player } from "@minecraft/server";
import { CompagnonManager } from "../class/CompagnonManager";

interface IMenuCommandBase {
  label: string;
  parent?: IMenuCommand["label"];
  description?: string;
  options?: { label: string; value: string }[];
}

interface ISelectMenuCommand extends IMenuCommandBase {
  type: "select";
  callback: (player: Player, compagnon: CompagnonManager, value: string | number) => void;
}

interface ISelectManyCommand extends IMenuCommandBase {
  type: "selectMany";
  callback: (player: Player, compagnon: CompagnonManager, value: Array<string | number>) => void;
}

interface IInputCommand extends IMenuCommandBase {
  type: "input";
  callback: (player: Player, compagnon: CompagnonManager, value: string) => void;
}

export type IMenuCommand = ISelectMenuCommand | ISelectManyCommand | IInputCommand;

export const UIMenuCommands: IMenuCommand[] = [];
