import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /emails` — verified against Mautic's REST API docs (`emails.html`,
 * "List Emails").
 */
const action: ActionDefinition = {
  key: "email-list",
  type: "read",
  resource: "email",
  title: "List emails",
  description: "List emails (both segment and template/transactional types).",
  params: [SEARCH_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic emails", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/emails",
      "emails",
      { query: { search: (p.search as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
