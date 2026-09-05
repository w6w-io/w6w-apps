import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import {
  addressesParam,
  CURRENCY_CODES,
  customFieldsParam,
  emailsParam,
  tagsParam,
  telephonesParam,
} from "../lib/params.ts";

/**
 * `POST /companies.add` — verified against
 * `developer.focus.teamleader.eu/docs/api/companies-add` on 2026-09-01.
 * Returns `201` with `{"data": {"type": "company", "id": "…"}}`.
 */
interface Input {
  name: string;
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
  marketingMailsConsent?: boolean;
  preferredCurrency?: string;
}

const companiesAdd: ActionDefinition<Input> = {
  key: "companies-add",
  type: "perform",
  resource: "company",
  title: "Add Company",
  idempotent: false,
  description: "Create a new company. Each call creates a new record — Teamleader publishes no " +
    "upsert-by-VAT-number endpoint, so de-duplicate with Companies List first if that matters.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "businessTypeId", label: "Business type ID", type: "string" },
    { key: "vatNumber", label: "VAT number", type: "string", placeholder: "BE0899623035" },
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
    {
      key: "remarks",
      label: "Remarks",
      type: "text",
      hint: "Background information, in Markdown.",
    },
    tagsParam,
    customFieldsParam,
    { key: "marketingMailsConsent", label: "Marketing mails consent", type: "boolean" },
    {
      key: "preferredCurrency",
      label: "Preferred currency",
      type: "select",
      options: CURRENCY_CODES.map((value) => ({ value, label: value })),
    },
  ],
  output: [
    { key: "id", type: "string", label: "New company ID" },
    { key: "type", type: "string", label: 'Resource type ("company")' },
  ],

  async execute(input, ctx) {
    return await call<{ id: string; type: string }>(
      ctx,
      "companies.add",
      compact({
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
        marketing_mails_consent: input.marketingMailsConsent,
        preferred_currency: input.preferredCurrency,
      }),
    );
  },
};

export default companiesAdd;
