import type { ActionDefinition } from "@w6w/types";
import { recruitCreate, type RecruitCreateInput } from "../lib/recruit.ts";
import { dataFields, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const jobOpeningCreate: ActionDefinition<RecruitCreateInput, ZohoRecruitRecordResult> = {
  key: "job-opening-create",
  type: "perform",
  resource: "job-opening",
  title: "Create Job Opening",
  description: 'Create a record in the Job Openings module. Zoho requires "Job_Opening_Name" and ' +
    '"Number_of_Positions" at minimum.',
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitCreate(ctx, "Job_Openings", input);
  },
};

export default jobOpeningCreate;
