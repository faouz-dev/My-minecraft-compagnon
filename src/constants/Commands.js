import { Player } from "@minecraft/server";

/**
 * Represents a command with its metadata and execution function
 * @typedef {Object} Command
 * @property {string} name - The name of the command
 * @property {string} [desc] - Optional description of the command
 * @property {string[]} [arg] - Optional array of argument names
 * @property {string[]} [alias] - Optional array of command aliases
 * @property {(arg: string[], player: Player) => void} function - The function to execute the command
 */
// export class Command {
//   name: string;
//   desc?: string;
//   arg?: string[];
//   alias?: string[];
//   function: ({ arg, player }: { arg?: string[]; player: Player }) => void;
// }

/**
 * @type {Command[]}
 */
export const COMMANDS = [];

/**
 * @type {{command : Command, try : number, player: Player, args: string []}[]}
 */
