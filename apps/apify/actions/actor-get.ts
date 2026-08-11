import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId } from "../lib/client.ts";
import { actorIdParam } from "../lib/params.ts";

/**
 * `GET /v2/actors/{actorId}` — everything about one Actor.
 *
 * Use it before Run Actor to read `defaultRunOptions` (the memory and timeout a
 * run will inherit) and `taggedBuilds` (what `latest` currently resolves to).
 *
 * A public Store Actor can be read without a token; a private one cannot. Since
 * every request from this app is signed, both work the same way here.
 */
interface Input {
  actorId: string;
}

const actorGet: ActionDefinition<Input> = {
  key: "actor-get",
  type: "read",
  resource: "actor",
  title: "Get Actor",
  description: "Fetch one Actor's full definition, including its default run options.",
  params: [actorIdParam],
  output: [{ key: "data", type: "object", label: "The Actor" }],

  execute(input, ctx) {
    return new ApifyClient(ctx).data(`/actors/${encodeId(input.actorId)}`);
  },
};

export default actorGet;
