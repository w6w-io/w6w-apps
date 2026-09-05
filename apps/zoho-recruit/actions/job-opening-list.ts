import type { ActionDefinition } from "@w6w/types";
import { recruitList, type RecruitListInput } from "../lib/recruit.ts";
import { listFields, pageParams } from "../lib/params.ts";

const jobOpeningList: ActionDefinition<RecruitListInput> = {
  key: "job-opening-list",
  type: "read",
  resource: "job-opening",
  title: "List Job Openings",
  // "Job_Openings" (with the underscore) is the documented module API name —
  // confirmed against a live sample response in Zoho's Modules API doc.
  // "JobOpenings" looks equally plausible and is wrong.
  description: "List records in the Job Openings module.",
  params: [
    listFields,
    ...pageParams,
    { key: "sort_by", label: "Sort by", type: "string", default: "Created_Time" },
    {
      key: "sort_order",
      label: "Sort order",
      type: "select",
      default: "desc",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Job Openings" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return recruitList(ctx, "Job_Openings", input);
  },
};

export default jobOpeningList;
