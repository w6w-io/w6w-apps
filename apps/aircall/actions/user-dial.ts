import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { e164Param, userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  to: string;
}

/**
 * `POST /v1/users/:id/dial` — pre-fill a User's Aircall Workspace dialler with a
 * number. Answers **204**. This is click-to-**dial**, and it is not the same
 * thing as Start Outbound Call.
 *
 * The difference is who places the call. This endpoint only fills the field:
 * "They will then be able to start the call within Aircall Workspace and will be
 * free to choose from which Number they want to start the call from." Nothing
 * rings, nothing is billed, and no `number_id` is required — the agent picks the
 * line. Start Outbound Call places the call itself and needs the Number up
 * front.
 *
 * Same platform constraints: Workspace Desktop only, and the User must be
 * available and not on a call (405 otherwise).
 */
const userDial: ActionDefinition<Input> = {
  key: "user-dial",
  type: "perform",
  resource: "user",
  title: "Dial Number in Workspace",
  description:
    "Click-to-dial: pre-fill a User's Workspace dialler with a number. The agent chooses the line " +
    "and starts the call — nothing is dialled by this call itself.",
  // Safe to retry, unlike Start Outbound Call: this writes a value into a UI
  // field, so replaying it leaves the same state and rings nobody.
  idempotent: true,
  params: [
    userIdParam,
    e164Param("to", "Number to pre-fill", true, "E.164, e.g. +18001231234."),
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const status = await client.status(`/users/${encodeId(input.userId)}/dial`, {
      method: "POST",
      body: { to: input.to },
    });
    return { status };
  },
};

export default userDial;
