import type { ActionDefinition } from "@w6w/types";
import { recruitChangeStatus, type RecruitChangeStatusInput } from "../lib/recruit.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

interface Input {
  ids: string;
  status: string;
  comments?: string;
}

interface Output {
  results: ZohoRecruitRecordResult[];
}

/**
 * `PUT /Job_Openings/status` — moves one or more Job Openings to a new
 * pipeline stage (`Job_Opening_Status`), e.g. In-progress -> On-hold ->
 * Closed.
 */
const jobOpeningStatusChange: ActionDefinition<Input, Output> = {
  key: "job-opening-status-change",
  type: "perform",
  resource: "job-opening",
  title: "Change Job Opening Status",
  description: "Move one or more Job Openings to a new pipeline stage (Job_Opening_Status).",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Job Opening ID(s)",
      type: "string",
      required: true,
      hint: "One id, or several comma-separated.",
    },
    {
      key: "status",
      label: "New status",
      type: "string",
      required: true,
      placeholder: "In-progress",
      hint:
        "A picklist value from the Job_Opening_Status field, e.g. In-progress, On-hold, Closed.",
    },
    { key: "comments", label: "Comments", type: "string" },
  ],
  output: [{ key: "results", type: "array", label: "Per-job-opening result" }],

  async execute(input, ctx) {
    const results = await recruitChangeStatus(
      ctx,
      "Job_Openings",
      "Job_Opening_Status",
      input as RecruitChangeStatusInput,
    );
    return { results };
  },
};

export default jobOpeningStatusChange;
