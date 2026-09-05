import type { ActionDefinition } from "@w6w/types";
import { boolStr, compact, TapfiliateClient } from "../lib/client.ts";
import { metaDataParam } from "../lib/params.ts";

/**
 * `POST /conversions/{?override_max_cookie_time}`
 *
 * Precedence when more than one attribution field is sent (highest to
 * lowest): customer id, coupon, referral code, click id, asset+source id,
 * tracking id.
 */
interface Input {
  referralCode?: string;
  trackingId?: string;
  clickId?: string;
  coupon?: string;
  currency?: string;
  assetId?: string;
  sourceId?: string;
  externalId?: string;
  amount?: number;
  customerId?: string;
  commissionType?: string;
  commissions?: unknown;
  metaData?: unknown;
  programGroup?: string;
  userAgent?: string;
  ip?: string;
  overrideMaxCookieTime?: boolean;
}

const conversionCreate: ActionDefinition<Input> = {
  key: "conversion-create",
  type: "perform",
  resource: "conversion",
  title: "Create Conversion",
  description:
    "Track a conversion, attributed to an affiliate via a customer id, coupon, referral code, " +
    "click id, or asset/source id pair.",
  idempotent: false,
  params: [
    { key: "coupon", label: "Coupon code", type: "string" },
    { key: "customerId", label: "Customer id (your own system's)", type: "string" },
    { key: "referralCode", label: "Referral code", type: "string" },
    { key: "trackingId", label: "Tracking id", type: "string" },
    { key: "clickId", label: "Click id", type: "string" },
    { key: "assetId", label: "Asset id", type: "string" },
    { key: "sourceId", label: "Source id", type: "string" },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint: "A unique id for this conversion in your own system — an order number, for example. " +
        "Must be unique per conversion.",
    },
    { key: "amount", label: "Amount", type: "number" },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "Three-letter ISO code. Overrides the program's default currency for this conversion.",
    },
    {
      key: "commissionType",
      label: "Commission type",
      type: "string",
      hint:
        "Identifier of one of the program's commission types. Defaults to the program's default.",
    },
    {
      key: "commissions",
      label: "Commissions override",
      type: "json",
      hint: "Overrides amount/commissionType if set. The vendor does not document a per-item " +
        "schema for this field beyond its example use.",
    },
    metaDataParam,
    { key: "programGroup", label: "Program group id", type: "string" },
    { key: "userAgent", label: "User agent", type: "string" },
    { key: "ip", label: "IP address", type: "string" },
    {
      key: "overrideMaxCookieTime",
      label: "Override max cookie time",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "id", type: "number", label: "Conversion id" },
    { key: "commissions", type: "array", label: "Commissions generated" },
    { key: "affiliate", type: "object", label: "The credited affiliate" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/conversions/", {
      method: "POST",
      query: compact({ override_max_cookie_time: boolStr(input.overrideMaxCookieTime) }),
      body: compact({
        coupon: input.coupon,
        customer_id: input.customerId,
        referral_code: input.referralCode,
        tracking_id: input.trackingId,
        click_id: input.clickId,
        asset_id: input.assetId,
        source_id: input.sourceId,
        external_id: input.externalId,
        amount: input.amount,
        currency: input.currency,
        commission_type: input.commissionType,
        commissions: input.commissions,
        meta_data: input.metaData,
        program_group: input.programGroup,
        user_agent: input.userAgent,
        ip: input.ip,
      }),
    });
  },
};

export default conversionCreate;
