import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { addressParam, customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

/**
 * `PUT /v2/contacts/:id` — update a contact.
 *
 * Tags are REPLACED wholesale: "When updating contact tags, you need to
 * provide all tags. Any missing tag will be removed from a contact's tags."
 * Leave the Tags field empty to leave tags untouched (nothing is sent), not to
 * clear them.
 */
interface Input {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  ownerId?: number;
  organizationId?: number;
  parentOrganizationId?: number;
  customerStatus?: string;
  prospectStatus?: string;
  title?: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: unknown;
  billingAddress?: unknown;
  shippingAddress?: unknown;
  tags?: string;
  customFields?: unknown;
  extraFields?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update an existing contact. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
    { key: "name", label: "Name (organization)", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    ownerIdParam,
    { key: "organizationId", label: "Belongs to organization (contact ID)", type: "number" },
    {
      key: "parentOrganizationId",
      label: "Parent organization (contact ID)",
      type: "number",
      hint: "Only for organization contacts. Set to null to clear the existing parent — pass it " +
        "via Additional fields, since this field omits null.",
    },
    {
      key: "customerStatus",
      label: "Customer status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current customer" },
        { value: "past", label: "Past customer" },
      ],
    },
    {
      key: "prospectStatus",
      label: "Prospect status",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "current", label: "Current prospect" },
        { value: "lost", label: "Lost prospect" },
      ],
    },
    { key: "title", label: "Job title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "industry", label: "Industry", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "mobile", label: "Mobile", type: "string" },
    addressParam("address", "Address"),
    addressParam("billingAddress", "Billing address"),
    addressParam("shippingAddress", "Shipping address"),
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
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        owner_id: input.ownerId,
        contact_id: input.organizationId,
        parent_organization_id: input.parentOrganizationId,
        customer_status: input.customerStatus,
        prospect_status: input.prospectStatus,
        title: input.title,
        description: input.description,
        industry: input.industry,
        website: input.website,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
      }),
      address: asOptionalJson(input.address, "Address"),
      billing_address: asOptionalJson(input.billingAddress, "Billing address"),
      shipping_address: asOptionalJson(input.shippingAddress, "Shipping address"),
      tags: toList(input.tags),
      custom_fields: asOptionalJson(input.customFields, "Custom fields"),
      ...(extra ?? {}),
    };
    return await new SellClient(ctx).update(
      `/contacts/${encodeURIComponent(String(input.id))}`,
      data,
    );
  },
};

export default contactUpdate;
