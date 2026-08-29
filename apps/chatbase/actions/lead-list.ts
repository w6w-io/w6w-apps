import type { ActionDefinition } from "@w6w/types";
import { ChatbaseV1Client, compact } from "../lib/client.ts";

/**
 * `GET /api/v1/get-leads` — leads/customers captured through an agent's lead
 * form. This is v1, not v2: as of 2026-08-29, v2 has no leads endpoint of any
 * kind, so unlike every other action in this app there is no v2 form to
 * prefer. See `lib/client.ts`'s module doc for the full v1/v2 story.
 *
 * v1 uses `chatbotId` where v2 says `agentId` — same identifier, older name,
 * kept as-is here since that is what this specific endpoint accepts on the
 * wire. v1 also pages with `page`/`size` rather than v2's cursor, and its
 * error body is the older `{"message": string}` shape with no machine code.
 */
interface Input {
  chatbotId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "read",
  resource: "lead",
  title: "List Leads",
  description:
    "List leads captured by an agent's lead form. Uses the legacy v1 API — v2 has no leads " +
    "endpoint as of this writing.",
  params: [
    { key: "chatbotId", label: "Agent (chatbot) ID", type: "string", required: true },
    { key: "startDate", label: "Start date", type: "date", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "End date", type: "date", hint: "YYYY-MM-DD." },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    { key: "size", label: "Page size", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "collectedCustomers", type: "array", label: "Captured leads" }],

  execute(input, ctx) {
    return new ChatbaseV1Client(ctx).request("/get-leads", {
      query: compact({
        chatbotId: input.chatbotId,
        startDate: input.startDate,
        endDate: input.endDate,
        page: input.page,
        size: input.size,
      }),
    });
  },
};

export default leadList;
