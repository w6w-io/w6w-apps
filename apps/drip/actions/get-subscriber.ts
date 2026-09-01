import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
}

const getSubscriber: ActionDefinition<Input> = {
  key: "get-subscriber",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description: "Fetch a subscriber by id, email, or visitor uuid.",
  params: [
    {
      key: "idOrEmail",
      label: "ID, email, or visitor UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<
      { subscribers?: Array<Record<string, unknown>> }
    >(
      `/subscribers/${encodeURIComponent(input.idOrEmail)}`,
    );
    return body.subscribers?.[0] ?? {};
  },
};

export default getSubscriber;
