import type { ActionDefinition } from "@w6w/types";
import { requestJson } from "../lib/client.ts";

/**
 * `GET /company/employees/attributes` — every attribute (standard and custom/dynamic) this
 * credential is allowed to read or write, with its `key` (the id an action or filter must
 * use, e.g. `dynamic_1`), `label`, `type` and — for `list`/`tags` type fields — the allowed
 * `options`. `/company/employees/custom-attributes` is documented as a plain alias of this
 * same endpoint, so only this one is implemented.
 */
type Input = Record<string, never>;

interface Attribute {
  key?: string;
  label?: string;
  type?: string;
  universal_id?: string | null;
  options?: string[];
}

interface AttributesResponse {
  data?: Attribute[];
}

const listEmployeeAttributes: ActionDefinition<Input, unknown> = {
  key: "list-employee-attributes",
  type: "read",
  resource: "employee",
  title: "List Employee Attributes",
  description: "List every standard and custom employee attribute this connection can " +
    "read or write, including the dynamic field ids (e.g. dynamic_1) other actions need.",
  requiresAuth: true,
  params: [],
  output: [
    { key: "attributes", type: "array", label: "Attributes" },
  ],

  async execute(_input, ctx) {
    const res = await requestJson<AttributesResponse>(ctx, "/company/employees/attributes");
    return { attributes: res.data ?? [] };
  },
};

export default listEmployeeAttributes;
