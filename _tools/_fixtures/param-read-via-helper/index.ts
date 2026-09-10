import type { AppDefinition } from "@w6w/types";
import forwardWhole from "./actions/forward-whole.ts";
import iterateEntries from "./actions/iterate-entries.ts";
import aliasCast from "./actions/alias-cast.ts";
import sameFileHelper from "./actions/same-file-helper.ts";

export default {
  actions: [forwardWhole, iterateEntries, aliasCast, sameFileHelper],
} satisfies AppDefinition;
