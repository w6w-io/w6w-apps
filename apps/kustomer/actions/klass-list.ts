import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: string;
}

const statusOptions = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

/**
 * `GET /v1/klasses` — verified against the Core Resources OAS. A Klass is
 * Kustomer's custom-object type definition (e.g. `order`, `subscription`);
 * its instances are KObjects (`kobject-list` / `kobject-create`).
 */
const klassList: ActionDefinition<Input> = {
  key: "klass-list",
  type: "read",
  resource: "klass",
  title: "List Klasses",
  description: "List the custom object types (Klasses) defined for your organization.",
  params: [
    { key: "name", label: "Name filter", type: "string" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/klasses", {
      query: { page: input.page, pageSize: input.pageSize, name: input.name, status: input.status },
    });
  },
};

export default klassList;
