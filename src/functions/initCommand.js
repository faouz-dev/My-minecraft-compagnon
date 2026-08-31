import { COMMANDS } from "../constants/Commands";

/**
 *
 * @param {import("../constants/Commands").Command} props
 */
export function initCommands(props) {
  const { name } = props;

  if (!name) throw new Error("name is required on command initialisation");

  COMMANDS.push(props);
}
