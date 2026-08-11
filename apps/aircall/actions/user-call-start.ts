import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { e164Param, userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  numberId: string;
  to: string;
}

/**
 * `POST /v1/users/:id/calls` — place an outbound call from a User's Aircall
 * Workspace. Answers **204**. This is the click-to-call primitive.
 *
 * Four preconditions, all of them the vendor's:
 *
 *  - The **User must be available and not already on a call** — otherwise 405.
 *  - The User must be **associated with the Number** being dialled from. List
 *    User Numbers returns exactly that set.
 *  - The **Number must be active (validated)**; inactive numbers show as such in
 *    the Dashboard.
 *  - It works on **Aircall Workspace Desktop only** — not iOS, not Android.
 *
 * Aircall also warns that the API "doesn't support multiple sessions", so
 * driving this while the agent has several Workspace tabs or the CTI open is
 * explicitly not recommended.
 */
const userCallStart: ActionDefinition<Input> = {
  key: "user-call-start",
  type: "perform",
  resource: "user",
  title: "Start Outbound Call",
  description:
    "Click-to-call: place an outbound call from a User's Aircall Workspace. Desktop Workspace " +
    "only; the User must be available and assigned to the Number.",
  // Never retryable. This rings a real phone and bills a real minute; there is
  // no idempotency key of any kind, so a retry after an ambiguous failure places
  // a SECOND call to the same person.
  idempotent: false,
  params: [
    userIdParam,
    {
      key: "numberId",
      label: "From Number",
      type: "string",
      required: true,
      placeholder: "1234",
      hint:
        "Numeric ID of an active Number this User is assigned to — List User Numbers returns the " +
        "eligible set.",
    },
    e164Param("to", "Number to dial", true, "E.164, e.g. +18001231234."),
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    ctx.log("info", "starting outbound call", { userId: input.userId, numberId: input.numberId });
    const status = await client.status(`/users/${encodeId(input.userId)}/calls`, {
      method: "POST",
      body: { number_id: Number(input.numberId), to: input.to },
    });
    return { status };
  },
};

export default userCallStart;
