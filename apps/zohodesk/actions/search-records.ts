import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId } from "../lib/params.ts";

interface Input extends DeskListInput {
  searchStr?: string;
  module?: "tickets" | "accounts" | "contacts" | "tasks";
  departmentId?: string;
  sortBy?: "relevance" | "modifiedTime";
}

const searchRecords: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "search-records",
  type: "search",
  resource: "search",
  title: "Search Records",
  description: "Search across tickets, accounts, contacts and tasks by keyword.",
  params: [
    { key: "searchStr", label: "Search text", type: "string" },
    {
      key: "module",
      label: "Module",
      type: "select",
      options: [
        { value: "tickets", label: "Tickets" },
        { value: "accounts", label: "Accounts" },
        { value: "contacts", label: "Contacts" },
        { value: "tasks", label: "Tasks" },
      ],
      hint: "Leave unset to search every module.",
    },
    { key: "departmentId", label: "Department ID", type: "string" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "modifiedTime", label: "Modified time" },
      ],
    },
    orgId,
    { key: "from", label: "From", type: "number", default: 0, hint: "Offset, 0-based (0-4999)." },
    { key: "limit", label: "Limit", type: "number", default: 10, hint: "1-5000." },
  ],
  output: [{ key: "data", type: "array", label: "Results" }],

  execute(input, ctx) {
    return deskList(ctx, "/search", input, {
      searchStr: input.searchStr,
      module: input.module,
      departmentId: input.departmentId,
      sortBy: input.sortBy,
    });
  },
};

export default searchRecords;
