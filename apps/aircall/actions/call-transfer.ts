import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact, encodeId } from "../lib/client.ts";
import { callIdParam, dispatchingStrategyOptions, e164Param } from "../lib/params.ts";

interface Input {
  callId: string;
  userId?: string;
  teamId?: string;
  number?: string;
  dispatchingStrategy?: string;
}

/**
 * `POST /v1/calls/:id/transfers` — cold-transfer a live Call to a User, a Team,
 * or an external number. Answers **204** with no body.
 *
 * The three destinations are mutually exclusive: "Only one of `user_id`,
 * `team_id` or `number` parameters are allowed for each request", and sending
 * two is a documented 400. That check is done here rather than left to the API
 * so the failure names the mistake instead of arriving as a bare 400.
 *
 * `dispatching_strategy` is **Team-only** — pairing it with `user_id` or
 * `number` is its own documented 400 — so it is dropped unless a team is the
 * destination.
 *
 * Two limits the vendor states plainly:
 *
 *  - Only **cold** transfers exist in the Public API, and a transfer that
 *    reaches an unavailable agent does not re-route: the caller lands on the
 *    "no one answers" strategy. For fallback routing Aircall points at the
 *    Smartflows "Ring to via API" widget instead.
 *  - **External transfers only work for inbound calls that have not yet been
 *    answered.**
 */
const callTransfer: ActionDefinition<Input> = {
  key: "call-transfer",
  type: "perform",
  resource: "call",
  title: "Transfer Call",
  description:
    "Cold-transfer a live Call to a User, a Team or an external number. Exactly one destination.",
  // Not retryable: by the time a transfer request fails ambiguously the call has
  // moved on, and a replayed transfer either 400s ("Call already ended") or
  // yanks a conversation that a human has since picked up.
  idempotent: false,
  params: [
    callIdParam,
    {
      key: "userId",
      label: "Transfer to User",
      type: "string",
      placeholder: "456",
      hint: "Numeric User ID. Mutually exclusive with Team and external number.",
    },
    {
      key: "teamId",
      label: "Transfer to Team",
      type: "string",
      placeholder: "678",
      hint: "Numeric Team ID. Mutually exclusive with User and external number.",
    },
    e164Param(
      "number",
      "Transfer to external number",
      false,
      "E.164, e.g. +18001231234. Works only for inbound calls that have not been answered yet. " +
        "Mutually exclusive with User and Team.",
    ),
    {
      key: "dispatchingStrategy",
      label: "Team dispatching strategy",
      type: "select",
      options: dispatchingStrategyOptions,
      hint:
        "Team transfers only. Aircall returns 400 if this is sent alongside a User or an external " +
        "number, so it is dropped unless a Team is the destination.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 204 on success" }],

  async execute(input, ctx) {
    const destinations = [input.userId, input.teamId, input.number].filter(
      (v) => v !== undefined && v !== null && v !== "",
    );
    if (destinations.length !== 1) {
      throw new Error(
        "Transfer Call needs exactly one destination: a User, a Team, or an external number " +
          `(got ${destinations.length}).`,
      );
    }

    const client = new AircallClient(ctx);
    const body = compact({
      user_id: input.userId,
      team_id: input.teamId,
      number: input.number,
      // Team-only; see the module comment.
      dispatching_strategy: input.teamId ? input.dispatchingStrategy : undefined,
    });
    ctx.log("info", "transferring call", { callId: input.callId, to: Object.keys(body)[0] });
    const status = await client.status(`/calls/${encodeId(input.callId)}/transfers`, {
      method: "POST",
      body,
    });
    return { status };
  },
};

export default callTransfer;
