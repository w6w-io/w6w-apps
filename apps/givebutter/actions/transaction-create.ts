import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";
import { paymentMethodOptions } from "../lib/params.ts";

const dedicationTypeOptions = [
  { value: "in_memory_of", label: "In memory of" },
  { value: "in_honor_of", label: "In honor of" },
];

interface Input {
  campaign_code?: string;
  campaign_title?: string;
  campaign_team_id?: number;
  team_member_id?: number;
  contact_id?: number;
  contact_external_id?: string;
  fund_code?: string;
  method: string;
  transacted_at: string;
  amount: string;
  mark_deposited?: boolean;
  timezone?: string;
  acknowledged_at?: string;
  external_label?: string;
  external_id?: string;
  contact_contact_since?: string;
  fee_covered?: string;
  platform_fee?: string;
  processing_fee?: string;
  check_number?: string;
  check_deposited_at?: string;
  company?: string;
  internal_note?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  dedication_type?: string;
  dedication_name?: string;
  dedication_recipient_name?: string;
  dedication_recipient_email?: string;
  giving_space_message?: string;
  appeal_code?: string;
  appeal_name?: string;
  appeal_status?: string;
}

/**
 * For recording an OFFLINE/manual gift (cash, check, a payment collected
 * elsewhere) into Givebutter's ledger. Only `method`, `transacted_at` and
 * `amount` are documented required; `campaign_code`/`campaign_title` and
 * `contact_id`/`contact_external_id` are each optional per the vendor's own
 * `StoreTransactionRequest` schema — neither pair is flagged required there,
 * and Givebutter's docs give no further prose on what an un-campaigned or
 * un-contacted transaction resolves to, so this app passes exactly what you
 * give it rather than guessing a default.
 */
const transactionCreate: ActionDefinition<Input> = {
  key: "transaction-create",
  type: "perform",
  resource: "transaction",
  title: "Create Transaction",
  description: "Record a transaction (typically an offline/manual gift) against the account.",
  idempotent: false,
  params: [
    {
      key: "method",
      label: "Payment method",
      type: "select",
      required: true,
      options: paymentMethodOptions,
    },
    { key: "transacted_at", label: "Transacted at", type: "datetime", required: true },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      required: true,
      hint: 'Decimal string, e.g. "25.00".',
    },
    { key: "campaign_code", label: "Campaign code", type: "string" },
    {
      key: "campaign_title",
      label: "Campaign title",
      type: "string",
      validation: { maxLength: 255 },
    },
    { key: "campaign_team_id", label: "Campaign team ID", type: "number" },
    { key: "team_member_id", label: "Team member ID", type: "number" },
    { key: "contact_id", label: "Contact ID", type: "number" },
    { key: "contact_external_id", label: "Contact external ID", type: "string" },
    { key: "contact_contact_since", label: "Contact since (if creating one)", type: "datetime" },
    { key: "fund_code", label: "Fund code", type: "string" },
    { key: "mark_deposited", label: "Mark deposited", type: "boolean" },
    { key: "timezone", label: "Timezone", type: "string" },
    { key: "acknowledged_at", label: "Acknowledged at", type: "datetime" },
    {
      key: "external_label",
      label: "External label",
      type: "string",
      validation: { maxLength: 255 },
    },
    { key: "external_id", label: "External ID", type: "string", validation: { maxLength: 255 } },
    { key: "fee_covered", label: "Fee covered (donor-paid)", type: "string" },
    { key: "platform_fee", label: "Platform fee", type: "string" },
    { key: "processing_fee", label: "Processing fee", type: "string" },
    { key: "check_number", label: "Check number", type: "string", validation: { maxLength: 255 } },
    { key: "check_deposited_at", label: "Check deposited at", type: "datetime" },
    { key: "company", label: "Company", type: "string", validation: { maxLength: 255 } },
    { key: "internal_note", label: "Internal note", type: "text" },
    { key: "first_name", label: "First name", type: "string", validation: { maxLength: 255 } },
    { key: "last_name", label: "Last name", type: "string", validation: { maxLength: 255 } },
    { key: "email", label: "Email", type: "string", validation: { maxLength: 255 } },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address_1", label: "Address line 1", type: "string" },
    { key: "address_2", label: "Address line 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zipcode", label: "Zip code", type: "string" },
    { key: "country", label: "Country", type: "string" },
    {
      key: "dedication_type",
      label: "Dedication type",
      type: "select",
      options: dedicationTypeOptions,
    },
    {
      key: "dedication_name",
      label: "Dedication name",
      type: "string",
      validation: { maxLength: 255 },
    },
    {
      key: "dedication_recipient_name",
      label: "Dedication recipient name",
      type: "string",
      validation: { maxLength: 255 },
    },
    { key: "dedication_recipient_email", label: "Dedication recipient email", type: "string" },
    { key: "giving_space_message", label: "Giving space message", type: "text" },
    { key: "appeal_code", label: "Appeal code", type: "string" },
    { key: "appeal_name", label: "Appeal name", type: "string" },
    { key: "appeal_status", label: "Appeal status", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const body = compact({
      campaign_code: input.campaign_code,
      campaign_title: input.campaign_title,
      campaign_team_id: input.campaign_team_id,
      team_member_id: input.team_member_id,
      contact_id: input.contact_id,
      contact_external_id: input.contact_external_id,
      contact_contact_since: input.contact_contact_since,
      fund_code: input.fund_code,
      method: input.method,
      transacted_at: input.transacted_at,
      amount: input.amount,
      mark_deposited: input.mark_deposited,
      timezone: input.timezone,
      acknowledged_at: input.acknowledged_at,
      external_label: input.external_label,
      external_id: input.external_id,
      fee_covered: input.fee_covered,
      platform_fee: input.platform_fee,
      processing_fee: input.processing_fee,
      check_number: input.check_number,
      check_deposited_at: input.check_deposited_at,
      company: input.company,
      internal_note: input.internal_note,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      phone: input.phone,
      address_1: input.address_1,
      address_2: input.address_2,
      city: input.city,
      state: input.state,
      zipcode: input.zipcode,
      country: input.country,
      dedication_type: input.dedication_type,
      dedication_name: input.dedication_name,
      dedication_recipient_name: input.dedication_recipient_name,
      dedication_recipient_email: input.dedication_recipient_email,
      giving_space_message: input.giving_space_message,
      appeal_code: input.appeal_code,
      appeal_name: input.appeal_name,
      appeal_status: input.appeal_status,
    });
    return await new GivebutterClient(ctx).data("/transactions", { method: "POST", body });
  },
};

export default transactionCreate;
