import type { ActionDefinition } from "@w6w/types";
import { recruitList, type RecruitListInput } from "../lib/recruit.ts";
import { listFields, pageParams } from "../lib/params.ts";

const candidateList: ActionDefinition<RecruitListInput> = {
  key: "candidate-list",
  type: "read",
  resource: "candidate",
  title: "List Candidates",
  description: "List records in the Candidates module.",
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
    {
      key: "converted",
      label: "Converted",
      type: "select",
      default: "false",
      options: [
        { value: "false", label: "Not converted" },
        { value: "true", label: "Converted" },
        { value: "both", label: "Both" },
      ],
    },
    {
      key: "approved",
      label: "Approved",
      type: "select",
      default: "true",
      hint: "Candidates procured from a web form may be pending approval.",
      options: [
        { value: "true", label: "Approved" },
        { value: "false", label: "Not approved" },
        { value: "both", label: "Both" },
      ],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Candidates" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return recruitList(ctx, "Candidates", input);
  },
};

export default candidateList;
