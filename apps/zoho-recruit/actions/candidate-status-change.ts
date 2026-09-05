import type { ActionDefinition } from "@w6w/types";
import { recruitChangeStatus, type RecruitChangeStatusInput } from "../lib/recruit.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

/**
 * `PUT /Candidates/status` — moves one or more Candidates to a new pipeline
 * stage (`Candidate_Status`), e.g. New -> Qualified -> Hired. Optionally
 * associates the change with a Job Opening via `jobIds`, which Zoho's own
 * sample uses to record "associated with Java Developer" alongside the
 * status update.
 */
interface Output {
  results: ZohoRecruitRecordResult[];
}

const candidateStatusChange: ActionDefinition<RecruitChangeStatusInput, Output> = {
  key: "candidate-status-change",
  type: "perform",
  resource: "candidate",
  title: "Change Candidate Status",
  description: "Move one or more Candidates to a new pipeline stage (Candidate_Status).",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Candidate ID(s)",
      type: "string",
      required: true,
      hint: "One id, or several comma-separated.",
    },
    {
      key: "status",
      label: "New status",
      type: "string",
      required: true,
      placeholder: "Qualified",
      hint: "A picklist value from the Candidate_Status field, e.g. New, Qualified, Hired.",
    },
    { key: "comments", label: "Comments", type: "string" },
    {
      key: "jobIds",
      label: "Job Opening ID(s)",
      type: "string",
      hint: "Associate this status change with one or more Job Openings.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Per-candidate result" }],

  async execute(input, ctx) {
    const results = await recruitChangeStatus(ctx, "Candidates", "Candidate_Status", input);
    return { results };
  },
};

export default candidateStatusChange;
