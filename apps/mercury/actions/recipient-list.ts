import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /recipients` — every saved recipient. `operationId: getAllRecipients` (unnamed in the summary). */
interface Input {
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface RecipientsResponse {
  recipients?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const recipientList: ActionDefinition<Input> = {
  key: "recipient-list",
  type: "search",
  resource: "recipient",
  title: "List Recipients",
  description: "List every saved recipient the organization can send money to.",
  params: paginationParams(1000, "asc"),
  output: [
    { key: "items", type: "array", label: "Recipients" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<RecipientsResponse>("/recipients", {
      query: {
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.recipients ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default recipientList;
