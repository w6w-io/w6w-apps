import type { AppDefinition } from "@w6w/types";
import uploadThing from "./actions/upload-thing.ts";

export default {
  actions: [uploadThing],
} satisfies AppDefinition;
