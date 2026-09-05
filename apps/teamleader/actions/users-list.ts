import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import { idsParam } from "../lib/params.ts";

/**
 * `POST /users.list` — verified against
 * `developer.focus.teamleader.eu/docs/api/users-list` on 2026-09-01.
 */
interface Input {
  ids?: string[];
  term?: string;
  status?: Array<"active" | "deactivated">;
  pageSize?: number;
  pageNumber?: number;
}

const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "Get a list of all users (Teamleader account members) — useful for resolving a " +
    "responsible_user_id or an assignee before creating a deal or task.",
  params: [
    idsParam,
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Filters on first name, last name, email and function.",
    },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: [
        { value: "active", label: "Active" },
        { value: "deactivated", label: "Deactivated" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "items", type: "array", label: "Users" }],

  async execute(input, ctx) {
    const filter = compact({ ids: input.ids, term: input.term, status: input.status });
    const items = await call<unknown[]>(
      ctx,
      "users.list",
      compact({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        page: input.pageSize !== undefined || input.pageNumber !== undefined
          ? { size: input.pageSize ?? 20, number: input.pageNumber ?? 1 }
          : undefined,
      }),
    );
    return { items: items ?? [] };
  },
};

export default usersList;
