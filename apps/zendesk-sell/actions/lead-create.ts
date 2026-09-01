import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { addressParam, customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/leads` — create a lead.
 *
 * `lastName` is required unless `organizationName` is set, and vice versa —
 * conditionally required exactly like Contacts, so neither is marked
 * `required` here.
 */
interface Input {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  ownerId?: number;
  status?: string;
  sourceId?: number;
  title?: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: unknown;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a lead. Provide lastName for an individual, or organizationName.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name (individual)", type: "string" },
    { key: "organizationName", label: "Organization name", type: "string" },
    ownerIdParam,
    { key: "status", label: "Status", type: "string", placeholder: "New" },
    { key: "sourceId", label: "Source ID", type: "number" },
    { key: "title", label: "Job title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "mobile", label: "Mobile", type: "string" },
    addressParam("address", "Address"),
    tagsParam,
    customFieldsParam,
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body, overriding the fields above. Covers fax, twitter, " +
        "facebook, linkedin, skype, unqualifiedReasonId and anything else the form does not.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New lead ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        owner_id: input.ownerId,
        status: input.status,
        source_id: input.sourceId,
        title: input.title,
        description: input.description,
        industry: input.industry,
        website: input.website,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
      }),
      address: asOptionalJson(input.address, "Address"),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).create("/leads", data, "lead");
  },
};

export default leadCreate;
