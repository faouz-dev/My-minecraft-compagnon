export interface IMenuCommand {
  label: string;
  parent?: IMenuCommand["label"] | undefined; // null for root
  description: string;
  type: "input" | "select" | "select_many";
  options?: { label: string; value: string }[];
  callback: (value: string) => void;
}

export const UIMenuCommands: IMenuCommand[] = [];
