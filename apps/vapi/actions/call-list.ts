import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { type DateRangeInput, dateRangeParams, dateRangeQuery, limitParam } from "../lib/params.ts";

/**
 * `GET /call` — bare array, no envelope. Same date-range-only pagination as
 * `assistant-list`.
 */
interface Input extends DateRangeInput {
  id?: string;
  assistantId?: string;
  phoneNumberId?: string;
  limit?: number;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "List calls, optionally filtered by assistant, phone number or call id.",
  params: [
    { key: "id", label: "Call ID", type: "string" },
    { key: "assistantId", label: "Assistant ID", type: "string" },
    { key: "phoneNumberId", label: "Phone Number ID", type: "string" },
    limitParam,
    ...dateRangeParams(),
  ],
  output: [{ key: "items", type: "array", label: "Calls" }],

  async execute(input, ctx) {
    const items = await new VapiClient(ctx).json<unknown[]>("/call", {
      query: {
        id: input.id,
        assistantId: input.assistantId,
        phoneNumberId: input.phoneNumberId,
        limit: input.limit,
        ...dateRangeQuery(input),
      },
    });
    return { items: stripSecrets(items) };
  },
};

export default callList;
