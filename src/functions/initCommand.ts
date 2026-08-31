import { COMMANDS, type Command } from "../constants/Commands";

export function initCommands(props: Command) {
  const { name } = props;

  if (!name) throw new Error("name is required on command initialisation");

  COMMANDS.push(props);
}
