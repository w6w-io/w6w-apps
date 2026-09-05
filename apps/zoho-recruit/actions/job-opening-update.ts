import type { ActionDefinition } from "@w6w/types";
import { recruitUpdate, type RecruitUpdateInput } from "../lib/recruit.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const jobOpeningUpdate: ActionDefinition<RecruitUpdateInput, ZohoRecruitRecordResult> = {
  key: "job-opening-update",
  type: "perform",
  resource: "job-opening",
  title: "Update Job Opening",
  description: "Update a record in the Job Openings module.",
  idempotent: true,
  params: [recordId, dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitUpdate(ctx, "Job_Openings", input);
  },
};

export default jobOpeningUpdate;
