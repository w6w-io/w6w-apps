import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { addressParam, customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

interface Input {
  id: number;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  ownerId?: number;
  status?: string;
  sourceId?: number;
  unqualifiedReasonId?: number;
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

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update an existing lead. Tags are replaced wholesale — supply the entire set.",
  idempotent: true,
  params: [
    { key: "id", label: "Lead ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "organizationName", label: "Organization name", type: "string" },
    ownerIdParam,
    { key: "status", label: "Status", type: "string" },
    { key: "sourceId", label: "Source ID", type: "number" },
    {
      key: "unqualifiedReasonId",
      label: "Unqualified reason ID",
      type: "number",
      hint: "Set when moving status to Unqualified.",
    },
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
      hint: "Merged into the request body, overriding the fields above.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Lead ID" },
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
        unqualified_reason_id: input.unqualifiedReasonId,
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
    return await new SellClient(ctx).update(`/leads/${encodeURIComponent(String(input.id))}`, data);
  },
};

export default leadUpdate;
