import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  seatId: string;
}

/**
 * `GET /api/v2/seats/{seat_id}` — accepts either the seat's UUID or its
 * Firebase Auth subject; both resolve to the same seat.
 */
const seatGet: ActionDefinition<Input> = {
  key: "seat-get",
  type: "read",
  resource: "seat",
  title: "Get Seat",
  description: "Retrieve one seat by its UUID or Firebase Auth subject.",
  params: [
    { key: "seatId", label: "Seat ID", type: "string", required: true },
  ],
  output: [{ key: "seat", type: "object", label: "Seat" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(`/api/v2/seats/${encodeURIComponent(input.seatId)}`);
  },
};

export default seatGet;
