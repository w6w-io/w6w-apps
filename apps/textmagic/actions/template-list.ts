import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /api/v2/templates` — this account's message templates. */
interface Input {
  page?: number;
  limit?: number;
}

const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List message templates.",
  params: paginationParams,
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/templates", {
      query: compact({ ...input }),
    });
  },
};

export default templateList;
