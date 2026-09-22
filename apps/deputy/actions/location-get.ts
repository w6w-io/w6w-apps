import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { ID_PARAM } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `GET /resource/Company/{id}` — one Location.
 *
 * Verified against the generated V1 reference, whose "Get location by id" page
 * under the hand-written section is `GET /v1/my/location/{id}` — a *different*
 * endpoint that returns the caller's own location, not an arbitrary one. This
 * action uses the resource route instead (`GET /resource/Company/{id}`), which
 * is the one that takes any Location id and answers the full `Company` schema
 * (see `location-list` for the field list).
 *
 * The id is what every employee and area record points at: `Company` on an
 * `Employee`, and the parent `Company` on an `OperationalUnit`.
 */
const action: ActionDefinition<Input> = {
  key: "location-get",
  type: "read",
  resource: "company",
  title: "Get location",
  description: "Get one Location (the `Company` resource) by its Deputy id. Note this is not the " +
    "`/my/location/{id}` endpoint, which only ever answers for the token's own owner.",
  params: [
    ID_PARAM("Location ID", "Deputy's internal Company id, e.g. from List Locations."),
  ],
  output: [
    { key: "Id", type: "number", label: "Location ID" },
    { key: "CompanyName", type: "string", label: "Location name" },
    { key: "Code", type: "string", label: "Short code" },
    { key: "ParentCompany", type: "number", label: "Parent location ID" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "IsWorkplace", type: "boolean", label: "Is a workplace" },
    { key: "IsPayrollEntity", type: "boolean", label: "Is a payroll entity" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting a Deputy location", { id: input.id });
    return await new DeputyClient(ctx).get("Company", input.id);
  },
};

export default action;
