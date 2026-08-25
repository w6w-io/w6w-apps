import type { ActionDefinition } from "@w6w/types";
import { orgIdFrom, ZohoDeskClient } from "../lib/client.ts";
import { orgId, ticketId } from "../lib/params.ts";

interface Input {
  ticketId: string;
  threadId: string;
  include?: string;
  orgId?: string;
}

const ticketThreadGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "ticket-thread-get",
  type: "read",
  resource: "ticket-thread",
  title: "Get Ticket Thread",
  description: "Get a single conversation thread on a ticket.",
  params: [
    ticketId,
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    { key: "include", label: "Include", type: "string", hint: "Supported value: plainText." },
    orgId,
  ],
  output: [{ key: "id", type: "string", label: "Thread ID" }],

  execute(input, ctx) {
    return new ZohoDeskClient(ctx).request(
      `/tickets/${encodeURIComponent(input.ticketId)}/threads/${
        encodeURIComponent(input.threadId)
      }`,
      { orgId: orgIdFrom(input, ctx), query: { include: input.include } },
    );
  },
};

export default ticketThreadGet;
