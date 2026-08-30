import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /tags` — verified against Mautic's REST API docs (`tags.html`, "List
 * Tags"). Unlike every other list endpoint in this app, the `tags` collection
 * is a **bare array**, not a map keyed by id — `MauticClient.requestAll`
 * normalises both shapes, so this action does not need to know that.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List tags",
  description: "List every tag defined on the instance.",
  params: [SEARCH_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic tags", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/tags",
      "tags",
      { query: { search: (p.search as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
