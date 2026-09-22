import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/Employee/INFO` — the Employee resource's field metadata.
 *
 * The generated V1 reference describes it as *"Returns the field list, types,
 * and associations for this resource. Useful when building integrations that
 * need to know which fields are queryable"*, and that is exactly what it is
 * used for here: `employee-search`'s `search`/`sort` clauses and
 * `employee-create`/`employee-update`'s `Additional fields` both take Deputy's
 * own property names, and this call is how a workflow (or the person writing
 * one) discovers them — including the custom fields a given install has added.
 *
 * The response body is returned as Deputy's own object rather than projected
 * into fields: the reference states the intent of the payload but not its
 * schema, and inventing a projection over metadata this app never reads would
 * be the kind of guess that looks authoritative and is not.
 *
 * It is also the cheapest call that needs no scope beyond existing — `INFO`
 * returns metadata, never records, and cannot echo a credential.
 */
const action: ActionDefinition = {
  key: "employee-fields",
  type: "read",
  resource: "employee",
  title: "Get employee fields",
  description:
    "List the Employee fields this install exposes (names, types and associations) — what " +
    "Search Employees and Create/Update Employee expect.",
  params: [],
  output: [
    { key: "response", type: "object", label: "Deputy's field metadata" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "reading Deputy Employee field metadata");
    return { response: await new DeputyClient(ctx).info("Employee") };
  },
};

export default action;
