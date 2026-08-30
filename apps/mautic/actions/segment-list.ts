import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /segments` — verified against Mautic's REST API docs
 * (`segments.html`, "List Segments").
 *
 * **The envelope's collection key is `lists`, not `segments`.** Mautic still
 * calls the underlying entity a "list" internally even though every current
 * surface — including this same doc page — calls it a Segment. Read the
 * wrong key here and you get `undefined` instead of a useful error.
 */
const action: ActionDefinition = {
  key: "segment-list",
  type: "read",
  resource: "segment",
  title: "List segments",
  description: 'List segments (Mautic\'s internal name for these is still "lists").',
  params: [SEARCH_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic segments", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/segments",
      "lists",
      { query: { search: (p.search as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
