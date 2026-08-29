import type { ActionDefinition } from "@w6w/types";
import { ApolloClient } from "../lib/client.ts";

/** `GET /contact_stages` — every contact stage configured for your team. */
const contactStageList: ActionDefinition<Record<string, never>> = {
  key: "contact-stage-list",
  type: "read",
  resource: "contact",
  title: "List Contact Stages",
  description: "List every contact stage configured for your team, for use with contact-create/" +
    "update, contact-stage-update and contact-search.",
  params: [],
  output: [{ key: "contact_stages", type: "array", label: "Contact stages" }],

  async execute(_input, ctx) {
    const body = await new ApolloClient(ctx).get<{ contact_stages?: unknown[] }>("/contact_stages");
    return { contact_stages: body.contact_stages ?? [] };
  },
};

export default contactStageList;
