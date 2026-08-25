import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /v3/verified-contacts` — every verified-contact route on the account's shared line. */
const verifiedContactList: ActionDefinition<Input> = {
  key: "verified-contact-list",
  type: "search",
  resource: "verified-contact",
  title: "List Verified Contacts",
  description: "List every verified-contact route attached to the account's shared line.",
  params: [],
  output: [{ key: "data", type: "object", label: "Contacts + line" }],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/v3/verified-contacts");
  },
};

export default verifiedContactList;
