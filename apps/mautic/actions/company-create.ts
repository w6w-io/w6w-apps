import type { ActionDefinition } from "@w6w/types";
import { compact, MauticClient } from "../lib/client.ts";

/**
 * `POST /companies/new` — verified against Mautic's REST API docs
 * (`companies.html`, "Create Company"). `companyname` is Mautic's own field
 * alias — every company field is prefixed `company*`, unlike a Contact's bare
 * `firstname`/`email`.
 */
const action: ActionDefinition = {
  key: "company-create",
  type: "perform",
  resource: "company",
  title: "Create a company",
  description: "Create a new company.",
  idempotent: false,
  params: [
    { key: "companyname", label: "Company Name", type: "string", required: true, default: "" },
    { key: "companyemail", label: "Email", type: "string", default: "" },
    { key: "companyphone", label: "Phone", type: "string", default: "" },
    { key: "companywebsite", label: "Website", type: "string", default: "" },
    { key: "companycity", label: "City", type: "string", default: "" },
    { key: "companystate", label: "State / Region", type: "string", default: "" },
    { key: "companycountry", label: "Country", type: "string", default: "" },
    {
      key: "companynumber_of_employees",
      label: "Number of Employees",
      type: "number",
      default: 0,
    },
    {
      key: "otherFields",
      label: "Other Fields (JSON)",
      type: "json",
      default: "",
      hint: 'Any other Company field alias, e.g. {"companyindustry": "Software"}.',
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.companyname ?? "").trim();
    if (!name) throw new Error("`companyname` is required");

    let other: Record<string, unknown> = {};
    if (p.otherFields) {
      if (typeof p.otherFields === "string") {
        try {
          other = JSON.parse(p.otherFields);
        } catch {
          throw new Error("`otherFields` is not valid JSON");
        }
      } else if (typeof p.otherFields === "object") {
        other = p.otherFields as Record<string, unknown>;
      }
    }

    const employees = Number(p.companynumber_of_employees ?? 0);
    const body = compact({
      companyname: name,
      companyemail: p.companyemail,
      companyphone: p.companyphone,
      companywebsite: p.companywebsite,
      companycity: p.companycity,
      companystate: p.companystate,
      companycountry: p.companycountry,
      companynumber_of_employees: employees > 0 ? employees : undefined,
      ...other,
    });

    ctx.log("info", "creating a Mautic company", { name });

    const res = await new MauticClient(ctx).request<{ company: unknown }>("/companies/new", {
      method: "POST",
      body,
    });
    return res.company;
  },
};

export default action;
