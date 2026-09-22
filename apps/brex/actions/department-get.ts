import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexNamedResource, encodeId } from "../lib/client.ts";
import { departmentIdParam } from "../lib/params.ts";

/**
 * `GET /v2/departments/{id}` — one department by id.
 */
interface Input {
  id: string;
}

const departmentGet: ActionDefinition<Input> = {
  key: "department-get",
  type: "read",
  resource: "department",
  title: "Get Department",
  description: "Fetch one Brex department by id.",
  params: [departmentIdParam],
  output: [
    { key: "id", type: "string", label: "Department id" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexNamedResource>(`/departments/${encodeId(input.id)}`);
  },
};

export default departmentGet;
