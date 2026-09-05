import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";

interface Input {
  id: string;
  memberId: string;
  targetStage?: string;
}

/**
 * Moves a candidate to another pipeline stage. Answers `202` with an empty
 * body on success (verified against the documented response example), so
 * `execute` returns the HTTP status rather than trying to parse JSON out of
 * nothing.
 *
 * Requisition fields (`fillReservedRequisition`, `requisition`) are
 * deliberately not exposed: they only matter when the target stage is a
 * headcount-gated one with a reserved requisition, which is an HR/finance
 * concern this recruiting-focused app does not otherwise touch.
 */
const candidateMove: ActionDefinition<Input> = {
  key: "candidate-move",
  type: "perform",
  resource: "candidate",
  title: "Move Candidate to Stage",
  description: "Move a candidate to another pipeline stage. Required scope: `w_candidates`. " +
    "`memberId` is required by Workable — the member performing the move.",
  idempotent: true,
  params: [
    { key: "id", label: "Candidate ID", type: "string", required: true },
    {
      key: "memberId",
      label: "Acting member ID",
      type: "string",
      required: true,
      hint: "From List Members — the member on whose behalf this move is recorded.",
    },
    {
      key: "targetStage",
      label: "Target stage",
      type: "string",
      hint: "Slug from List Job Pipeline Stages, e.g. `phone-screen`.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (202 on success)" }],

  execute(input, ctx) {
    return new WorkableClient(ctx).status(`/candidates/${encodeURIComponent(input.id)}/move`, {
      method: "POST",
      body: compact({ member_id: input.memberId, target_stage: input.targetStage }),
    });
  },
};

export default candidateMove;
