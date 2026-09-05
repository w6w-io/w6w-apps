import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import {
  addressesParam,
  customFieldsParam,
  emailsParam,
  tagsParam,
  telephonesParam,
} from "../lib/params.ts";

/**
 * `POST /companies.update` — verified against
 * `developer.focus.teamleader.eu/docs/api/companies-update` on 2026-09-01.
 * Returns `204 No Content`.
 *
 * Same wholesale-replace rule as `contacts.update`: `emails`, `telephones`,
 * `addresses` and `tags` are REPLACED entirely, not merged — send the full
 * set you want. `custom_fields` supports partial updates via
 * `custom_fields_update_strategy: "partial"`.
 */
interface Input {
  id: string;
  name?: string;
  businessTypeId?: string;
  vatNumber?: string;
  nationalIdentificationNumber?: string;
  emails?: unknown[];
  telephones?: unknown[];
  website?: string;
  addresses?: unknown[];
  responsibleUserId?: string;
  remarks?: string;
  tags?: string[];
  customFields?: unknown[];
  customFieldsUpdateStrategy?: "partial";
}

const companiesUpdate: ActionDefinition<Input> = {
  key: "companies-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  idempotent: true,
  description: "Update a company. Collections (emails, telephones, addresses, tags) are " +
    "REPLACED wholesale — provide the full set, not just the change. Custom fields can be " +
    "updated partially via `custom_fields_update_strategy`.",
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "businessTypeId", label: "Business type ID", type: "string" },
    { key: "vatNumber", label: "VAT number", type: "string" },
    {
      key: "nationalIdentificationNumber",
      label: "National identification number",
      type: "string",
    },
    emailsParam,
    telephonesParam,
    { key: "website", label: "Website", type: "string" },
    addressesParam,
    { key: "responsibleUserId", label: "Responsible user ID", type: "string" },
    { key: "remarks", label: "Remarks", type: "text" },
    tagsParam,
    customFieldsParam,
    {
      key: "customFieldsUpdateStrategy",
      label: "Custom fields update strategy",
      type: "select",
      options: [{ value: "partial", label: "Partial — leave unlisted custom fields untouched" }],
    },
  ],
  output: [{ key: "id", type: "string", label: "Company ID" }],

  async execute(input, ctx) {
    await call(
      ctx,
      "companies.update",
      compact({
        id: input.id,
        name: input.name,
        business_type_id: input.businessTypeId,
        vat_number: input.vatNumber,
        national_identification_number: input.nationalIdentificationNumber,
        emails: input.emails,
        telephones: input.telephones,
        website: input.website,
        addresses: input.addresses,
        responsible_user_id: input.responsibleUserId,
        remarks: input.remarks,
        tags: input.tags,
        custom_fields: input.customFields,
        custom_fields_update_strategy: input.customFieldsUpdateStrategy,
      }),
    );
    return { id: input.id };
  },
};

export default companiesUpdate;
