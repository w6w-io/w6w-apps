import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

/**
 * `GET /v1/phone-numbers` — list every phone number (and its users) in the workspace.
 *
 * Unlike the calls/messages/contacts/conversations/tasks lists, this endpoint takes no
 * `maxResults`/`pageToken` — Quo's own `ListPhoneNumbersResponse` schema requires only `data`,
 * and returns the full unpaginated list. This is also the auth `test` probe (`auth/api-key.ts`).
 */
interface Input {
  userId?: string;
}

const phoneNumberList: ActionDefinition<Input> = {
  key: "phone-number-list",
  type: "search",
  resource: "phone-number",
  title: "List Phone Numbers",
  description: "Retrieve every phone number and its users in the Quo workspace. Not paginated.",
  params: [userIdParam],
  output: [
    {
      key: "data",
      type: "array",
      label: "Phone numbers (id, name, number, formattedNumber, forward, groupId, " +
        "portingStatus, symbol, users, restrictions)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/phone-numbers", { query: { userId: input.userId } });
  },
};

export default phoneNumberList;
