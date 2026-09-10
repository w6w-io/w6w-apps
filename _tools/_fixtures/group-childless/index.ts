import type { AppDefinition } from "@w6w/types";
import createThing from "./actions/create-thing.ts";
import createThingOk from "./actions/create-thing-ok.ts";

export default {
  actions: [createThing, createThingOk],
} satisfies AppDefinition;
