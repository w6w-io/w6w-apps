import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
}

const unsubscribeSubscriber: ActionDefinition<Input> = {
  key: "unsubscribe-subscriber",
  type: "perform",
  resource: "subscriber",
  title: "Unsubscribe from All Mailings",
  description: "Globally unsubscribe a subscriber from every mailing, not just one campaign.",
  idempotent: true,
  params: [
    {
      key: "idOrEmail",
      label: "ID, email, or visitor UUID",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "id", type: "string", label: "Subscriber ID" }, {
    key: "status",
    type: "string",
    label: "Status",
  }],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<
      { subscribers?: Array<Record<string, unknown>> }
    >(
      `/subscribers/${encodeURIComponent(input.idOrEmail)}/unsubscribe_all`,
      { method: "POST" },
    );
    return body.subscribers?.[0] ?? {};
  },
};

export default unsubscribeSubscriber;
