import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";
import { encodeId } from "../lib/ids.ts";
import { typedCustomFieldsParam } from "../lib/params.ts";

/**
 * `PATCH /contacts/{contact_id}` — update a person already saved in your Apollo instance.
 *
 * `label_names`, if set, REPLACES the contact's lists rather than adding to them — per
 * Apollo's own docs. Use `list-add-records` to add without disturbing existing lists.
 */
interface Input {
  contact_id: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  title?: string;
  account_id?: string;
  email?: string;
  website_url?: string;
  label_names?: string[] | string;
  contact_stage_id?: string;
  present_raw_address?: string;
  direct_phone?: string;
  mobile_phone?: string;
  typed_custom_fields?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on a contact already saved in your Apollo instance.",
  // A PATCH that sets absolute field values converges to the same end state on retry.
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact", type: "string", required: true },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "organization_name", label: "Employer name", type: "string" },
    { key: "account_id", label: "Account", type: "string" },
    { key: "website_url", label: "Employer website", type: "string" },
    {
      key: "label_names",
      label: "Lists (replaces existing)",
      type: "string",
      hint: "Comma-separated. REPLACES this contact's current lists — use list-add-records to " +
        "add without removing others.",
    },
    { key: "contact_stage_id", label: "Contact stage", type: "string" },
    { key: "present_raw_address", label: "Location", type: "string" },
    { key: "direct_phone", label: "Direct phone", type: "string" },
    { key: "mobile_phone", label: "Mobile phone", type: "string" },
    typedCustomFieldsParam,
  ],
  output: [{ key: "contact", type: "object", label: "The updated contact" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).patch<{ contact?: unknown }>(
      `/contacts/${encodeId(input.contact_id)}`,
      {
        body: compact({
          first_name: input.first_name,
          last_name: input.last_name,
          organization_name: input.organization_name,
          title: input.title,
          account_id: input.account_id,
          email: input.email,
          website_url: input.website_url,
          label_names: toArr(input.label_names),
          contact_stage_id: input.contact_stage_id,
          present_raw_address: input.present_raw_address,
          direct_phone: input.direct_phone,
          mobile_phone: input.mobile_phone,
          typed_custom_fields: input.typed_custom_fields,
        }),
      },
    );
    return { contact: body.contact ?? null };
  },
};

export default contactUpdate;
