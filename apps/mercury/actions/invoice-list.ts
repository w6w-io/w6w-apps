import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /ar/invoices` — every accounts-receivable invoice. */
interface Input {
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface InvoicesResponse {
  invoices?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "search",
  resource: "invoice",
  title: "List Invoices",
  description: "List every accounts-receivable invoice.",
  params: paginationParams(1000, "asc"),
  output: [
    { key: "items", type: "array", label: "Invoices" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<InvoicesResponse>("/ar/invoices", {
      query: {
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.invoices ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default invoiceList;
