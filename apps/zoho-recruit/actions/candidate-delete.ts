import type { ActionDefinition } from "@w6w/types";
import { recruitDelete, type RecruitDeleteInput } from "../lib/recruit.ts";
import { recordId, writeOutput } from "../lib/params.ts";
import type { ZohoRecruitRecordResult } from "../lib/client.ts";

const candidateDelete: ActionDefinition<RecruitDeleteInput, ZohoRecruitRecordResult> = {
  key: "candidate-delete",
  type: "perform",
  resource: "candidate",
  title: "Delete Candidate",
  description: "Delete a record from the Candidates module.",
  idempotent: true,
  params: [recordId],
  output: writeOutput,

  execute(input, ctx) {
    return recruitDelete(ctx, "Candidates", input);
  },
};

export default candidateDelete;
