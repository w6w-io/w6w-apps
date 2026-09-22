import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/Company` — the install's Locations.
 *
 * ## The UI calls these Locations; the API calls them Company
 *
 * Deputy's own hand-written reference page **"Get Locations"** is literally
 * `GET /v1/resource/Company` (verified by reading the page's embedded OpenAPI
 * definition, 2026-09-22), and the generated reference calls the same resource
 * `Company` throughout — *"List Company records"*. So a workflow looking for
 * "locations" is reading the `Company` resource, and this action is named for
 * the UI concept while the doc comment records why the request says `Company`.
 *
 * The documented `Company` properties are `Id`, `Portfolio`, `Code` (six
 * characters — Deputy's short location code), `Active`, `ParentCompany`,
 * `CompanyName`, `TradingName`, `BusinessNumber`, `CompanyNumber`,
 * `IsWorkplace`, `IsPayrollEntity`, `PayrollExportCode`, `Address`, `Contact`,
 * `Creator`, `Created`, `Modified` and the expanded `ParentCompanyObject` /
 * `AddressObject` / `ContactObject`. `IsWorkplace` is what the UI means by
 * "location you can roster at", and `IsPayrollEntity` is what it means by a
 * payroll-exportable one; both are separate flags on the same record.
 *
 * The list form takes no documented query parameters, and there is no
 * `join` on it — a Company row carries bare ids for its address and contact.
 */
const action: ActionDefinition = {
  key: "location-list",
  type: "read",
  resource: "company",
  title: "List locations",
  description:
    "Every Location (the `Company` resource) this connection may see, with its short code, " +
    "parent, and its workplace / payroll flags.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Company (Location) records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deputy locations");
    const items = await new DeputyClient(ctx).list<Record<string, unknown>>("Company");
    return { items, count: items.length };
  },
};

export default action;
