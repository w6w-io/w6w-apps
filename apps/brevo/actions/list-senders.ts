import type { ActionDefinition } from "@w6w/types";
import { BrevoClient, type BrevoList } from "../lib/client.ts";

interface Input {
  ip?: string;
  domain?: string;
  limit?: number;
}

const listSenders: ActionDefinition<Input> = {
  key: "list-senders",
  type: "read",
  resource: "sender",
  title: "List Senders",
  description: "List sender identities registered on the account.",
  params: [
    { key: "ip", label: "IP filter", type: "string" },
    { key: "domain", label: "Domain filter", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Optional. When omitted, returns every sender.",
    },
  ],
  output: [
    { key: "senders", type: "array", label: "Senders" },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const res = await client.request<BrevoList<"senders">>("/senders", {
      query: { ip: input.ip, domain: input.domain },
    });
    if (input.limit && Array.isArray(res.senders)) {
      return { ...res, senders: res.senders.slice(0, input.limit) };
    }
    return res;
  },
};

export default listSenders;
