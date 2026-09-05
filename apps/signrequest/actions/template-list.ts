import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  limit?: number;
}

/** `GET /templates/` — list templates created via the SignRequest UI. */
const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "read",
  resource: "template",
  title: "List Templates",
  description: "List templates created via the SignRequest UI.",
  params: [pageParam, limitParam],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Templates" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/templates/", {
      query: compact({ page: input.page, limit: input.limit }),
    });
  },
};

export default templateList;
