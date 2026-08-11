import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId, V2 } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `GET /v2/users/:id` — one User, by numeric id **or by email address**.
 *
 * Aircall documents both forms verbatim (`GET /v2/users/456` and
 * `GET /v2/users/john.doe@aircall.io`), which is why the id is escaped with a
 * function that leaves `@` and `.` intact.
 *
 * v2 rather than v1 for the same reason as List Users: the v1 User endpoints
 * carry a deprecation banner. The cost is that the v2 User has no `numbers`
 * array — use List User Numbers.
 */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Retrieve User",
  description: "Fetch one User by numeric ID or by email address, via the v2 API.",
  params: [userIdParam],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "available", type: "boolean", label: "Available per their working hours" },
    {
      key: "availability_status",
      type: "string",
      label: "available | custom | unavailable — the coarse field",
    },
    { key: "substatus", type: "string", label: "Reason chosen for an unavailable status" },
    { key: "time_zone", type: "string", label: "IANA timezone, default Etc/UTC" },
    { key: "language", type: "string", label: "IETF language tag, default en-US" },
    { key: "wrap_up_time", type: "number", label: "Seconds of after-call work" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/users/${encodeId(input.userId)}`, "user", { prefix: V2 });
  },
};

export default userGet;
