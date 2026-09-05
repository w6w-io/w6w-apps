import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, toList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

const dedicationTypeOptions = [
  { value: "in_memory_of", label: "In memory of" },
  { value: "in_honor_of", label: "In honor of" },
];

interface Input {
  id: string;
  internal_note?: string;
  check_number?: string;
  check_deposited_at?: string;
  custom_fields?: string;
  team_id?: string;
  campaign_member_id?: string;
  fund_id?: string;
  campaign_id?: string;
  method?: string;
  transacted_at?: string;
  appeal_id?: string;
  offline_payment_received?: string;
  dedication_type?: string;
  dedication_name?: string;
  dedication_recipient_name?: string;
  dedication_recipient_email?: string;
}

const transactionUpdate: ActionDefinition<Input> = {
  key: "transaction-update",
  type: "perform",
  resource: "transaction",
  title: "Update Transaction",
  description: "Update a transaction's editable fields. Only fields you set are changed.",
  idempotent: true,
  params: [
    idParam("Transaction"),
    {
      key: "internal_note",
      label: "Internal note",
      type: "text",
      validation: { maxLength: 131070 },
    },
    { key: "check_number", label: "Check number", type: "string", validation: { maxLength: 255 } },
    { key: "check_deposited_at", label: "Check deposited at", type: "datetime" },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "string",
      hint: "Comma-separated. Givebutter documents this as a bare array of strings with no " +
        "further shape.",
    },
    { key: "team_id", label: "Team ID", type: "string" },
    { key: "campaign_member_id", label: "Campaign member ID", type: "string" },
    { key: "fund_id", label: "Fund ID", type: "string" },
    { key: "campaign_id", label: "Campaign ID", type: "string" },
    { key: "method", label: "Payment method", type: "string" },
    { key: "transacted_at", label: "Transacted at", type: "datetime" },
    { key: "appeal_id", label: "Appeal ID", type: "string" },
    { key: "offline_payment_received", label: "Offline payment received", type: "string" },
    {
      key: "dedication_type",
      label: "Dedication type",
      type: "select",
      options: dedicationTypeOptions,
      hint: "Setting a dedication requires all four dedication fields.",
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
  ],
  output: [
    { key: "id", type: "string", label: "Transaction ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const dedication = input.dedication_type
      ? {
        type: input.dedication_type,
        name: input.dedication_name,
        recipient_name: input.dedication_recipient_name ?? null,
        recipient_email: input.dedication_recipient_email ?? null,
      }
      : undefined;

    const body = compact({
      internal_note: input.internal_note,
      check_number: input.check_number,
      check_deposited_at: input.check_deposited_at,
      custom_fields: toList(input.custom_fields),
      team_id: input.team_id,
      campaign_member_id: input.campaign_member_id,
      fund_id: input.fund_id,
      campaign_id: input.campaign_id,
      method: input.method,
      transacted_at: input.transacted_at,
      appeal_id: input.appeal_id,
      offline_payment_received: input.offline_payment_received,
      dedication,
    });
    return await new GivebutterClient(ctx).data(`/transactions/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default transactionUpdate;
