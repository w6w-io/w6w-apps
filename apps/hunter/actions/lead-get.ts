import type { ActionDefinition } from "@w6w/types";
import { HunterClient } from "../lib/client.ts";

/** `GET /v2/leads/{id}` — fetch a single saved lead by its numeric ID. Free. */
interface Input {
  id: number;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch a single saved lead by ID. Free.",
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
  ],
  output: [
    { key: "data", type: "object", label: "email, first_name, last_name, verification{}, ..." },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request(`/leads/${encodeURIComponent(String(input.id))}`);
  },
};

export default leadGet;
