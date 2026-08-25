import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  email?: string;
  limit?: number;
  offset?: number;
}

/**
 * `GET /api/v2/seats` — seats are the rep/user accounts a message can be
 * attributed to via `seat_id` on `message-send`/`group-send-message`/
 * `carousel-send`.
 */
const seatList: ActionDefinition<Input> = {
  key: "seat-list",
  type: "search",
  resource: "seat",
  title: "List Seats",
  description: "List seats (users/reps) for this company.",
  params: [
    { key: "email", label: "Filter by email (exact match)", type: "string" },
    { key: "limit", label: "Limit", type: "number" },
    { key: "offset", label: "Offset", type: "number" },
  ],
  output: [{ key: "seats", type: "array", label: "Seats" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(
      "/api/v2/seats",
      compact({
        email: input.email,
        limit: input.limit,
        offset: input.offset,
      }),
    );
  },
};

export default seatList;
