import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  email?: string;
}

/** `GET /api/v2/seats/count`. */
const seatCount: ActionDefinition<Input> = {
  key: "seat-count",
  type: "read",
  resource: "seat",
  title: "Get Seat Count",
  description: "Get the number of seats for this company.",
  params: [
    { key: "email", label: "Filter by email (exact match)", type: "string" },
  ],
  output: [{ key: "count", type: "number", label: "Seat count" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/v2/seats/count", compact({ email: input.email }));
  },
};

export default seatCount;
