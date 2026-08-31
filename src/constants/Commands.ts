import { Player } from "@minecraft/server";

/**
 * Represents a command with its metadata and execution function
 */
export interface Command {
  name: string;
  desc?: string;
  arg?: string[];
  alias?: string[];
  function: (arg: string[], player: Player) => void;
}

export const COMMANDS: Command[] = [];
