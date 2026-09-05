import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam, subscriberIdParam } from "../lib/params.ts";

/** `GET /accounts/{accountId}/lists/{listId}/subscribers/{subscriberId}`. */
interface Input {
  accountId: string;
  listId: string;
  subscriberId: string;
}

const subscriberGet: ActionDefinition<Input> = {
  key: "subscriber-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description: "Get one subscriber by id.",
  params: [accountIdParam, listIdParam, subscriberIdParam],
  output: [
    { key: "id", type: "number", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    const { accountId, listId, subscriberId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/subscribers/${
        encodeId(subscriberId)
      }`,
    );
  },
};

export default subscriberGet;
