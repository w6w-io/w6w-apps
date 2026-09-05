import type { ActionDefinition } from "@w6w/types";
import { recruitUpdate, type RecruitUpdateInput } from "../lib/recruit.ts";
import { dataFields, recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const candidateUpdate: ActionDefinition<RecruitUpdateInput, ZohoRecruitRecordResult> = {
  key: "candidate-update",
  type: "perform",
  resource: "candidate",
  title: "Update Candidate",
  description: "Update a record in the Candidates module.",
  idempotent: true,
  params: [recordId, dataFields],
  output: writeOutput,

  execute(input, ctx) {
    return recruitUpdate(ctx, "Candidates", input);
  },
};

export default candidateUpdate;
