import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  number: string;
}

/**
 * `GET /api/evaluate-service` — determine whether a number supports iMessage
 * or SMS. Billed separately from message sends: the Lookup API has its own
 * budget (documented as 30/hour, 100/day per line by default) and does not
 * count against messaging limits.
 */
const lookupNumber: ActionDefinition<Input> = {
  key: "lookup-number",
  type: "read",
  resource: "lookup",
  title: "Lookup Number",
  description: "Check whether a phone number supports iMessage or SMS.",
  params: [
    { key: "number", label: "Number", type: "string", required: true, hint: "E.164 format." },
  ],
  output: [
    { key: "number", type: "string", label: "Number" },
    { key: "service", type: "string", label: "Service (iMessage or SMS)" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/evaluate-service", { number: input.number });
  },
};

export default lookupNumber;
