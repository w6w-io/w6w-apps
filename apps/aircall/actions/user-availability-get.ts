import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `GET /v1/users/:id/availability` — one User's operational availability.
 *
 * The response is `{"availability": "after_call_work"}` — a bare string under a
 * one-key envelope, not a User object — so this action returns
 * `{ userId, availability }` and keeps the id the caller passed, which the
 * vendor's payload does not echo.
 *
 * Documented values: `available`, `offline`, `do_not_disturb`, `in_call`,
 * `after_call_work`. These are the Activity-Feed statuses, and are a different
 * vocabulary from the `availability_status` field on a User object
 * (`available` / `custom` / `unavailable`). v1 only — v2 publishes no
 * availability endpoint.
 */
const userAvailabilityGet: ActionDefinition<Input> = {
  key: "user-availability-get",
  type: "read",
  resource: "user",
  title: "Check User Availability",
  description:
    "One User's operational availability: available, offline, do_not_disturb, in_call or " +
    "after_call_work.",
  params: [userIdParam],
  output: [
    { key: "userId", type: "string", label: "The User as identified in the request" },
    {
      key: "availability",
      type: "string",
      label: "available | offline | do_not_disturb | in_call | after_call_work",
    },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const body = await client.json<{ availability?: string }>(
      `/users/${encodeId(input.userId)}/availability`,
    );
    return { userId: input.userId, availability: body?.availability };
  },
};

export default userAvailabilityGet;
