import type { ActionDefinition } from "@w6w/types";
import { recruitGet, type RecruitGetInput } from "../lib/recruit.ts";
import { listFields, recordId } from "../lib/params.ts";

const candidateGet: ActionDefinition<RecruitGetInput> = {
  key: "candidate-get",
  type: "read",
  resource: "candidate",
  title: "Get Candidate",
  description: "Get a single record from the Candidates module by id.",
  params: [recordId, listFields],
  output: [{ key: "id", type: "string", label: "Candidate" }],

  execute(input, ctx) {
    return recruitGet(ctx, "Candidates", input);
  },
};

export default candidateGet;
