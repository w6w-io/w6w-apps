import type { ActionDefinition } from "@w6w/types";
import { recruitList, type RecruitListInput } from "../lib/recruit.ts";
import { listFields, pageParams } from "../lib/params.ts";

const clientList: ActionDefinition<RecruitListInput> = {
  key: "client-list",
  type: "read",
  resource: "client",
  title: "List Clients",
  description:
    "List records in the Clients module — the hiring companies Recruit works on behalf of.",
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
    { key: "data", type: "array", label: "Clients" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return recruitList(ctx, "Clients", input);
  },
};

export default clientList;
