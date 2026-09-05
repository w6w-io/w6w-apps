import type { ActionDefinition } from "@w6w/types";
import { compact, LglClient } from "../lib/client.ts";

interface Input {
  constituent_id: number;
  gift_type_name: string;
  gift_type_id?: number;
  received_amount?: number;
  received_date?: string;
  fund_name?: string;
  fund_id?: number;
  campaign_name?: string;
  campaign_id?: number;
  appeal_name?: string;
  appeal_id?: number;
  payment_type_name?: string;
  note?: string;
  is_anon?: boolean;
  external_id?: string;
}

/**
 * `POST /api/v1/constituents/{constituent_id}/gifts.json`.
 *
 * LGL's `CreateBody` schema marks both `gift_type_id` and `gift_type_name`
 * required. Per-account gift/fund/campaign/appeal type ids are configured
 * per organization and not enumerable from the API reference, so this
 * action asks for the human-readable `gift_type_name` (e.g. "Cash", "Check",
 * "In Kind" — the account's own configured type names) and accepts an
 * optional numeric id override for accounts that prefer it.
 */
const giftCreate: ActionDefinition<Input> = {
  key: "gift-create",
  type: "perform",
  resource: "gift",
  title: "Create Gift",
  description: "Log a new gift against a constituent.",
  idempotent: false,
  params: [
    {
      key: "constituent_id",
      label: "Constituent ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "gift_type_name",
      label: "Gift type",
      type: "string",
      required: true,
      hint: 'The account\'s configured gift type name, e.g. "Cash", "Check", "In Kind".',
    },
    {
      key: "gift_type_id",
      label: "Gift type ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "LGL's schema also lists a numeric gift type id as required alongside the name; " +
        "provide it if your account's integration expects the id form.",
    },
    { key: "received_amount", label: "Amount", type: "number" },
    {
      key: "received_date",
      label: "Gift date",
      type: "string",
      placeholder: "2026-01-01",
    },
    { key: "fund_name", label: "Fund name", type: "string" },
    { key: "fund_id", label: "Fund ID", type: "number", validation: { integer: true, min: 1 } },
    { key: "campaign_name", label: "Campaign name", type: "string" },
    {
      key: "campaign_id",
      label: "Campaign ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "appeal_name", label: "Appeal name", type: "string" },
    {
      key: "appeal_id",
      label: "Appeal ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "payment_type_name", label: "Payment type name", type: "string" },
    { key: "note", label: "Gift note", type: "text" },
    { key: "is_anon", label: "Anonymous gift", type: "boolean", default: false },
    { key: "external_id", label: "External Gift ID", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Gift ID" },
    { key: "received_amount", type: "number", label: "Amount" },
  ],

  async execute(input, ctx) {
    const body = compact({
      gift_type_name: input.gift_type_name,
      gift_type_id: input.gift_type_id,
      received_amount: input.received_amount,
      received_date: input.received_date,
      fund_name: input.fund_name,
      fund_id: input.fund_id,
      campaign_name: input.campaign_name,
      campaign_id: input.campaign_id,
      appeal_name: input.appeal_name,
      appeal_id: input.appeal_id,
      payment_type_name: input.payment_type_name,
      note: input.note,
      is_anon: input.is_anon,
      external_id: input.external_id,
    });
    return await new LglClient(ctx).create(`/constituents/${input.constituent_id}/gifts`, body);
  },
};

export default giftCreate;
