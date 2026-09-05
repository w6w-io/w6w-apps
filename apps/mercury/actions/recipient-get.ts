import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { recipientIdParam } from "../lib/params.ts";

/** `GET /recipient/{recipientId}` — a single recipient by ID. */
interface Input {
  recipientId: string;
}

const recipientGet: ActionDefinition<Input> = {
  key: "recipient-get",
  type: "read",
  resource: "recipient",
  title: "Get Recipient",
  description: "Retrieve a single saved recipient by ID.",
  params: [recipientIdParam],
  output: [{ key: "recipient", type: "object", label: "Recipient" }],

  async execute(input, ctx) {
    const recipient = await new MercuryClient(ctx).json(
      `/recipient/${encodeURIComponent(input.recipientId)}`,
    );
    return { recipient };
  },
};

export default recipientGet;
