import type { ActionDefinition } from "@w6w/types";
import { recruitCreate, type RecruitCreateInput } from "../lib/recruit.ts";
import { dataFields, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const candidateCreate: ActionDefinition<RecruitCreateInput, ZohoRecruitRecordResult> = {
  key: "candidate-create",
  type: "perform",
  resource: "candidate",
  title: "Create Candidate",
  description: "Create a record in the Candidates module.",
  idempotent: false,
  params: [dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitCreate(ctx, "Candidates", input);
  },
};

export default candidateCreate;
