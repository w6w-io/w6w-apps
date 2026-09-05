import type { ActionDefinition } from "@w6w/types";
import { recruitGet, type RecruitGetInput } from "../lib/recruit.ts";
import { listFields, recordId } from "../lib/params.ts";

const jobOpeningGet: ActionDefinition<RecruitGetInput> = {
  key: "job-opening-get",
  type: "read",
  resource: "job-opening",
  title: "Get Job Opening",
  description: "Get a single record from the Job Openings module by id.",
  params: [recordId, listFields],
  output: [{ key: "id", type: "string", label: "Job Opening" }],

  execute(input, ctx) {
    return recruitGet(ctx, "Job_Openings", input);
  },
};

export default jobOpeningGet;
