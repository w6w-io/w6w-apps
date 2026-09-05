import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  contacts?: string;
  page?: number;
  per_page?: number;
}

const planList: ActionDefinition<Input> = {
  key: "plan-list",
  type: "read",
  resource: "plan",
  title: "List Recurring Plans",
  description: "List recurring giving plans on the connected account.",
  params: [
    { key: "contacts", label: "Contact IDs", type: "string", hint: "Comma-separated contact ids." },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Recurring plans" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const query = compact({ contacts: input.contacts, ...paginationQuery(input) });
    return await new GivebutterClient(ctx).page("/plans", { query }) as PageEnvelope<unknown>;
  },
};

export default planList;
