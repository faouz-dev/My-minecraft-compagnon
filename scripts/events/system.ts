import { system, world } from "@minecraft/server";
import { CompagnonGuiderCustomComponent } from "../customComponents/CompagnonGuiderCustomComponent";

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent("mycompagnon:compagnon_guider", new CompagnonGuiderCustomComponent());
});
