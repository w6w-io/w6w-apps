import type { ActionDefinition } from "@w6w/types";
import { recruitDelete, type RecruitDeleteInput } from "../lib/recruit.ts";
import { recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const jobOpeningDelete: ActionDefinition<RecruitDeleteInput, ZohoRecruitRecordResult> = {
  key: "job-opening-delete",
  type: "perform",
  resource: "job-opening",
  title: "Delete Job Opening",
  description: "Delete a record from the Job Openings module.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return recruitDelete(ctx, "Job_Openings", input);
  },
};

export default jobOpeningDelete;
