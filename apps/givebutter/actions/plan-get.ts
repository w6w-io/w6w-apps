import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  amount?: string;
}

const planGet: ActionDefinition<Input> = {
  key: "plan-get",
  type: "read",
  resource: "plan",
  title: "Get Recurring Plan",
  description: "Fetch a single recurring plan by its uid.",
  params: [
    idParam("Plan", "The plan's uid, from a prior list call."),
    {
      key: "first_name",
      label: "First name",
      type: "string",
      hint: "Givebutter documents this query param alongside the plan uid with no further " +
        "explanation of its effect. Passed through as-is.",
    },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "amount", label: "Amount", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Plan ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "frequency", type: "string", label: "Frequency" },
    { key: "amount", type: "string", label: "Amount" },
  ],

  async execute(input, ctx) {
    const query = compact({
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      amount: input.amount,
    });
    return await new GivebutterClient(ctx).data(`/plans/${encodeURIComponent(input.id)}`, {
      query,
    });
  },
};

export default planGet;
