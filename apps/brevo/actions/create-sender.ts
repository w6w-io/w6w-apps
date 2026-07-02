import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  name: string;
  email: string;
  ips?: Array<{ ip: string; domain: string; weight?: number }>;
}

const createSender: ActionDefinition<Input> = {
  key: "create-sender",
  type: "perform",
  resource: "sender",
  title: "Create Sender",
  description: "Register a sender identity (name + email).",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true, placeholder: "name@email.com" },
    {
      key: "ips",
      label: "Dedicated IPs",
      type: "json",
      hint: "Enterprise-only. JSON array of `{ip, domain, weight}` items.",
    },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    const body: Record<string, unknown> = { name: input.name, email: input.email };
    if (input.ips) body.ips = input.ips;
    return client.request("/senders", { method: "POST", body });
  },
};

export default createSender;
