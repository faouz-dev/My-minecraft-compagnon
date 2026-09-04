import { IMenuCommand, UIMenuCommands } from "../constants/UIMenuCommands";

export function registerUIMenuCommand(props: IMenuCommand) {
  UIMenuCommands.push(props);
}
