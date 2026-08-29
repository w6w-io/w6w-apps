import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  personId: number;
  cadenceId: number;
  userId?: number;
  stepId?: number;
}

/**
 * POST /v2/cadence_memberships — enroll a person into a cadence.
 * `person_id` and `cadence_id` are required and travel as QUERY params (not
 * a JSON body) — confirmed against
 * developers.salesloft.com/docs/api/cadence-memberships-create, which also
 * documents the permission rule this wraps: a person cannot be added on
 * behalf of a teammate unless the cadence is a team cadence, is owned by
 * that teammate, or the caller has the Personal Cadence Admin permission.
 * `user_id` defaults to the authenticated user; `step_id` defaults to the
 * cadence's first step.
 */
const cadenceMembershipCreate: ActionDefinition<Input> = {
  key: "cadence-membership-create",
  type: "perform",
  resource: "cadence-membership",
  title: "Enroll Person in Cadence",
  description: "Add a person to a cadence, optionally starting at a specific step.",
  idempotent: false,
  params: [
    { key: "personId", label: "Person ID", type: "number", required: true },
    { key: "cadenceId", label: "Cadence ID", type: "number", required: true },
    {
      key: "userId",
      label: "User ID",
      type: "number",
      hint:
        "Defaults to the authenticated user. The cadence must be owned by, shared with, or a team cadence for this user.",
    },
    {
      key: "stepId",
      label: "Step ID",
      type: "number",
      hint: "Defaults to the cadence's first step.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Cadence membership" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/cadence_memberships", {
      method: "POST",
      query: compact({
        person_id: input.personId,
        cadence_id: input.cadenceId,
        user_id: input.userId,
        step_id: input.stepId,
      }),
    });
  },
};

export default cadenceMembershipCreate;
