import type { ActionDefinition } from "@w6w/types";
import { MarketoClient, type MarketoRecordResult } from "../lib/client.ts";
import { FIELDS_PARAM, LIST_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /rest/v1/lists/{listId}/leads.json` — verified against
 * `list-membership.md` ("Get Leads by List ID"). Paged by an opaque
 * `nextPageToken`/`moreResult` pair, not offset/limit — `batchSize` defaults
 * to and caps at 300.
 */
const action: ActionDefinition = {
  key: "list-get-members",
  type: "read",
  resource: "list",
  title: "Get list members",
  description: "List the leads that belong to a static list.",
  params: [
    LIST_ID_PARAM,
    FIELDS_PARAM,
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
      hint: "Page through every member rather than stopping at the first page.",
    },
    {
      key: "batchSize",
      label: "Batch Size",
      type: "number",
      default: 300,
      hint: "Default and maximum is 300.",
      showIf: { "==": [{ var: "returnAll" }, false] },
    },
  ],
  output: [{ key: "id", type: "number", label: "ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listId = Number(p.listId);
    if (!Number.isFinite(listId)) throw new Error("`listId` must be a number");
    const returnAll = p.returnAll === true;
    const fields = (p.fields as string) || undefined;

    ctx.log("info", "getting Marketo list members", { listId, returnAll });

    const client = new MarketoClient(ctx);
    const items: MarketoRecordResult[] = [];
    let nextPageToken: string | undefined;
    for (;;) {
      const res = await client.request<MarketoRecordResult[]>(`/lists/${listId}/leads.json`, {
        query: {
          fields,
          batchSize: returnAll ? 300 : Number(p.batchSize ?? 300),
          nextPageToken,
        },
      });
      const batch = res.result ?? [];
      items.push(...batch);
      // list-membership.md documents `nextPageToken` but never a `moreResult`
      // flag for this endpoint (unlike the schema/fields browse endpoints).
      // A short/empty page is treated as the end, same defensive stop
      // `mautic`'s `requestAll` uses for its own offset paging.
      nextPageToken = res.nextPageToken || undefined;
      if (!returnAll || !nextPageToken || batch.length === 0) break;
    }

    return items;
  },
};

export default action;
