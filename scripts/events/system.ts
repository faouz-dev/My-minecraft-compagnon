import { system, world } from "@minecraft/server";
import { CompagnonStickCustomComponent } from "../customComponents/CompagnonStickCustomComponent";

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent(
    "mycompagnon:compagnon_stick",
    new CompagnonStickCustomComponent(),
  );
});
