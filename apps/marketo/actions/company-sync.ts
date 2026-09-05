import type { ActionDefinition } from "@w6w/types";
import { compact, MarketoClient, type MarketoRecordResult } from "../lib/client.ts";

/**
 * `POST /rest/v1/companies.json` — verified against `companies.md` ("Create
 * and Update"). Same three-mode shape as `lead-sync` (`createOrUpdate`
 * default, `createOnly`, `updateOnly`), deduped by `dedupeBy` (defaults to
 * `dedupeFields`, i.e. `externalCompanyId`).
 *
 * Company APIs are **read-only** when the subscription has Salesforce or
 * Microsoft Dynamics CRM sync enabled — Marketo's own docs state this
 * without a way to detect it from the API itself, so a `createOrUpdate` that
 * silently no-ops or fails on a CRM-synced instance is that setting, not a
 * bug here.
 */
const action: ActionDefinition = {
  key: "company-sync",
  type: "perform",
  resource: "company",
  title: "Create or update a company",
  description: "Create a company, update one, or either — deduped by externalCompanyId.",
  idempotent: false,
  params: [
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "createOrUpdate",
      options: [
        { value: "createOrUpdate", label: "Create or Update" },
        { value: "createOnly", label: "Create Only" },
        { value: "updateOnly", label: "Update Only" },
      ],
    },
    {
      key: "externalCompanyId",
      label: "External Company ID",
      type: "string",
      hint: "The default dedupe key. Required for createOnly/createOrUpdate unless another key " +
        "is configured on this instance.",
    },
    { key: "company", label: "Company Name", type: "string" },
    {
      key: "otherFields",
      label: "Other Fields (JSON)",
      type: "json",
      hint: 'Any other company field, e.g. {"annualRevenue": 5000000}.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    let other: Record<string, unknown> = {};
    if (p.otherFields) {
      try {
        other = typeof p.otherFields === "string"
          ? JSON.parse(p.otherFields)
          : p.otherFields as Record<string, unknown>;
      } catch {
        throw new Error("`otherFields` must be valid JSON");
      }
    }

    const record = compact({
      externalCompanyId: p.externalCompanyId,
      company: p.company,
      ...other,
    });
    if (Object.keys(record).length === 0) throw new Error("at least one company field is required");

    ctx.log("info", "syncing a Marketo company", { action: p.action ?? "createOrUpdate" });

    const res = await new MarketoClient(ctx).request<MarketoRecordResult[]>("/companies.json", {
      method: "POST",
      body: { action: p.action ?? "createOrUpdate", input: [record] },
    });
    return res.result?.[0] ?? null;
  },
};

export default action;
