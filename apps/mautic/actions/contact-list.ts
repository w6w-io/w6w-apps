import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /contacts` — verified against Mautic's REST API docs (`contacts.html`,
 * "List Contacts"). The envelope's collection key is `contacts`, matching the
 * resource name.
 */
const action: ActionDefinition = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List contacts",
  description: "List contacts, optionally filtered by a Mautic search command.",
  params: [
    SEARCH_PARAM,
    {
      key: "publishedOnly",
      label: "Published Only",
      type: "boolean",
      default: false,
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic contacts", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/contacts",
      "contacts",
      {
        query: {
          search: (p.search as string) || undefined,
          publishedOnly: p.publishedOnly === true ? "1" : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
