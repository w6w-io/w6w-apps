import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";

interface Input {
  id: string;
  memberId: string;
  disqualifyReasonId?: string;
  disqualifyNote?: string;
  withdrew?: boolean;
}

/**
 * Disqualifies a candidate. Answers `200` with an empty (single-space)
 * plain-text body on success — verified against the documented response
 * example — so `execute` returns the HTTP status rather than parsing JSON.
 *
 * This is deliberately kept a step away from a one-click accident: there is
 * no default reason, and `disqualifyReasonId` should come from
 * `disqualification-reason-list` rather than being typed freehand.
 */
const candidateDisqualify: ActionDefinition<Input> = {
  key: "candidate-disqualify",
  type: "perform",
  resource: "candidate",
  title: "Disqualify Candidate",
  description:
    "Disqualify a candidate. Required scope: `w_candidates`. `memberId` is required by Workable " +
    "— the member performing the disqualification.",
  idempotent: true,
  params: [
    { key: "id", label: "Candidate ID", type: "string", required: true },
    {
      key: "memberId",
      label: "Acting member ID",
      type: "string",
      required: true,
      hint: "From List Members — the member on whose behalf this disqualification is recorded.",
    },
    {
      key: "disqualifyReasonId",
      label: "Reason ID",
      type: "string",
      hint: "From List Disqualification Reasons.",
    },
    { key: "disqualifyNote", label: "Note", type: "text", validation: { maxLength: 256 } },
    {
      key: "withdrew",
      label: "Candidate withdrew (vs. rejected)",
      type: "boolean",
      hint: "true = the candidate withdrew; false/unset = rejected.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (200 on success)" }],

  execute(input, ctx) {
    return new WorkableClient(ctx).status(
      `/candidates/${encodeURIComponent(input.id)}/disqualify`,
      {
        method: "POST",
        body: compact({
          member_id: input.memberId,
          disqualify_reason_id: input.disqualifyReasonId,
          disqualify_note: input.disqualifyNote,
          withdrew: input.withdrew,
        }),
      },
    );
  },
};

export default candidateDisqualify;
