import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
}

/**
 * `GET /api/v1/tasks` — verified against `getTasks`. Unlike `clients`,
 * `invoices`, `quotes`, `payments` and `products`, this operation's own
 * parameter list documents only `include`/`index`/`page`/`per_page` — no
 * `status` or `client_id` filter — so neither is exposed here.
 */
const taskGetMany: ActionDefinition<Input> = {
  key: "task-get-many",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks.",
  params: [...pagination],
  output: [{ key: "data", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/tasks", {
      query: { page: input.page, per_page: input.perPage },
    });
  },
};

export default taskGetMany;
