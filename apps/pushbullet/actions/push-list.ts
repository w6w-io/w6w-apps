import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `GET /v2/pushes` — push history.
 *
 * Pagination and sync params (`active`, `limit`, `cursor`, `modified_after`)
 * come from the vendor's general "Objects" section ("All calls to list
 * objects (list-*) accept the active, limit, and cursor parameters" / "All
 * calls to list objects accept a modified_after property"), which this
 * endpoint's own field table also documents explicitly. The default (maximum)
 * `limit` is 500 including deleted pushes; this action prefills a much
 * smaller default so a first call does not pull an account's entire history.
 */
interface Input {
  modifiedAfter?: number;
  active?: boolean;
  cursor?: string;
  limit?: number;
}

interface PushListResponse {
  pushes?: unknown[];
  cursor?: string;
}

const pushList: ActionDefinition<Input> = {
  key: "push-list",
  type: "read",
  resource: "push",
  title: "List Pushes",
  description: "List push history, most recently modified first.",
  params: [
    {
      key: "modifiedAfter",
      label: "Modified after",
      type: "number",
      hint: "Unix timestamp (seconds). Only pushes modified after this time are returned. Use " +
        "the most recent `modified` value you have seen — not the local clock.",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      hint: "Exclude deleted pushes. Recommended for an initial sync.",
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "From a previous response's cursor." },
    { key: "limit", label: "Limit", type: "number", default: 50, validation: { min: 1, max: 500 } },
  ],
  output: [
    { key: "pushes", type: "array", label: "Pushes" },
    { key: "cursor", type: "string", label: "Cursor for the next page, if any" },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<PushListResponse>("/pushes", {
      query: compact({
        modified_after: input.modifiedAfter,
        active: input.active,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { pushes: body.pushes ?? [], cursor: body.cursor };
  },
};

export default pushList;
