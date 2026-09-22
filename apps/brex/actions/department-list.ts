import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/departments` — every department in the account.
 *
 * Same shape and same single `name` filter as locations, and the ids it returns
 * are what `user-invite` / `user-update` / `user-list` take as
 * `department_id`(`[]`).
 */
interface Input {
  name?: string;
  limit?: number;
  cursor?: string;
}

const departmentList: ActionDefinition<Input> = {
  key: "department-list",
  type: "search",
  resource: "department",
  title: "List Departments",
  description: "List the account's Brex departments, optionally filtered by name.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Brex's `name` filter." },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Departments" },
    { key: "next_cursor", type: "string", label: "Cursor for the next page, or null at the end" },
    { key: "count", type: "number", label: "Departments in this page" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).list<BrexNamedResource>("/departments", {
      query: { name: input.name, cursor: input.cursor, limit: input.limit },
    });
  },
};

export default departmentList;
