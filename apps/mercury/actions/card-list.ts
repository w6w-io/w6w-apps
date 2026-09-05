import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/** `GET /cards` — list cards with filters. `operationId` not named in the summary; path is `/cards`. */
interface Input {
  accountId?: string[];
  status?: string[];
  type?: string[];
  kind?: string[];
  userId?: string;
  isAgentCard?: boolean;
  limit?: number;
  order?: "asc" | "desc";
  startAfter?: string;
  endBefore?: string;
}

interface CardsResponse {
  cards?: unknown[];
  page?: { nextPage?: string; previousPage?: string };
}

const cardList: ActionDefinition<Input> = {
  key: "card-list",
  type: "search",
  resource: "card",
  title: "List Cards",
  description: "List debit and credit cards, with account, status, type, and cardholder filters.",
  params: [
    { key: "accountId", label: "Account IDs", type: "array", item: { type: "string" } },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "active", label: "Active" },
        { value: "frozen", label: "Frozen" },
        { value: "cancelled", label: "Cancelled" },
        { value: "inactive", label: "Inactive" },
        { value: "expired", label: "Expired" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "multiselect",
      options: [
        { value: "virtual", label: "Virtual" },
        { value: "physical", label: "Physical" },
      ],
    },
    {
      key: "kind",
      label: "Kind",
      type: "multiselect",
      options: [
        { value: "debit", label: "Debit" },
        { value: "credit", label: "Credit" },
      ],
    },
    { key: "userId", label: "Cardholder user ID", type: "string", advanced: true },
    { key: "isAgentCard", label: "Agent cards only", type: "boolean", advanced: true },
    ...paginationParams(500, "asc"),
  ],
  output: [
    { key: "items", type: "array", label: "Cards" },
    { key: "nextPage", type: "string", label: "Cursor for the next page" },
    { key: "previousPage", type: "string", label: "Cursor for the previous page" },
  ],

  async execute(input, ctx) {
    const body = await new MercuryClient(ctx).json<CardsResponse>("/cards", {
      query: {
        accountId: input.accountId,
        status: input.status,
        type: input.type,
        kind: input.kind,
        userId: input.userId,
        isAgentCard: input.isAgentCard,
        limit: input.limit,
        order: input.order,
        start_after: input.startAfter,
        end_before: input.endBefore,
      },
    });
    return {
      items: body?.cards ?? [],
      nextPage: body?.page?.nextPage,
      previousPage: body?.page?.previousPage,
    };
  },
};

export default cardList;
