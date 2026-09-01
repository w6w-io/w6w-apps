import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SellClient, toList } from "../lib/client.ts";
import { addressParam, customFieldsParam, ownerIdParam, tagsParam } from "../lib/params.ts";

/**
 * `POST /v2/contacts` — create a contact (an individual or an organization).
 *
 * `name` is required only for an organization; `last_name` is required only
 * for an individual — the vendor's own reference states both as conditionally
 * required rather than either being universally mandatory, so neither is
 * marked `required` here (the API itself returns a `blank` resource error,
 * surfaced verbatim, if the one the record's type needs is missing).
 *
 * `is_organization` "can be set only during creation and cannot be changed
 * later" — this is the one field this app exposes on create but not update.
 *
 * `extraFields` covers the remaining documented string fields (`fax`,
 * `twitter`, `facebook`, `linkedin`, `skype`) rather than a param apiece.
 */
interface Input {
  name?: string;
  firstName?: string;
  lastName?: string;
  isOrganization?: boolean;
  ownerId?: number;
  organizationId?: number;
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

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact. Provide name for an organization, or lastName for an individual.",
  idempotent: false,
  params: [
    { key: "name", label: "Name (organization)", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name (individual)", type: "string" },
    {
      key: "isOrganization",
      label: "Is an organization",
      type: "boolean",
      default: false,
      hint: "Can only be set on create — not changeable afterwards.",
    },
    ownerIdParam,
    {
      key: "organizationId",
      label: "Belongs to organization (contact ID)",
      type: "number",
      hint: "Set only when this contact is an individual belonging to an organization contact.",
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
    addressParam(
      "billingAddress",
      "Billing address",
      'Only meaningful once customerStatus or prospectStatus is not "none".',
    ),
    addressParam(
      "shippingAddress",
      "Shipping address",
      'Only meaningful once customerStatus or prospectStatus is not "none".',
    ),
    tagsParam,
    customFieldsParam,
    {
      key: "extraFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Merged into the request body, overriding the fields above. Covers fax, twitter, " +
        "facebook, linkedin, skype and anything else the form does not.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New contact ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const extra = asOptionalJson<Record<string, unknown>>(input.extraFields, "Additional fields");
    const data = {
      ...compact({
        name: input.name,
        first_name: input.firstName,
        last_name: input.lastName,
        is_organization: input.isOrganization,
        owner_id: input.ownerId,
        contact_id: input.organizationId,
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
    return await new SellClient(ctx).create("/contacts", data, "contact");
  },
};

export default contactCreate;
