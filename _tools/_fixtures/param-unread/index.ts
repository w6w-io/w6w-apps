import type { ActionDefinition, AppDefinition } from "@w6w/types";
import doThing from "./actions/do-thing.ts";

/**
 * Registered under a key with NO `actions/no-source.ts` on disk — pins M6:
 * `param/unread` must skip an action whose source is not at the conventional
 * path, never flag it and never crash trying to read a file that isn't there.
 */
interface NoSourceInput {
  anything: string;
}
const noSource: ActionDefinition<NoSourceInput> = {
  key: "no-source",
  type: "perform",
  resource: "thing",
  title: "No Source",
  description:
    "Fixture action registered with no actions/no-source.ts on disk.",
  params: [
    { key: "anything", label: "Anything", type: "string" },
  ],
  execute(_input, _ctx) {
    return {};
  },
};

export default {
  actions: [doThing, noSource],
} satisfies AppDefinition;
