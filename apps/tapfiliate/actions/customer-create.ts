import type { ActionDefinition } from "@w6w/types";
import { boolStr, compact, TapfiliateClient } from "../lib/client.ts";
import { metaDataParam } from "../lib/params.ts";

/**
 * `POST /customers/{?override_max_cookie_time}`
 *
 * The docs require exactly one of a tracking id, referral code, click id,
 * coupon code, or an asset_id + source_id pair to attribute the customer to
 * an affiliate, with that precedence when more than one is sent (highest to
 * lowest): coupon, referral code, click id, asset+source id, tracking id.
 * None of them are marked `required` here because the vendor accepts any one
 * — sending none creates an unattributed customer rather than erroring.
 */
interface Input {
  customerId: string;
  referralCode?: string;
  trackingId?: string;
  clickId?: string;
  coupon?: string;
  assetId?: string;
  sourceId?: string;
  status?: string;
  userAgent?: string;
  ip?: string;
  metaData?: unknown;
  overrideMaxCookieTime?: boolean;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer, attributed to an affiliate via a coupon, referral code, click id, or " +
    "asset/source id pair. Requires customer_id; every other attribution field is optional but " +
    "at least one should be set to credit an affiliate.",
  idempotent: false,
  params: [
    {
      key: "customerId",
      label: "Your customer id",
      type: "string",
      required: true,
      hint: "The id for this customer in your own system. Must be unique per customer.",
    },
    { key: "coupon", label: "Coupon code", type: "string" },
    {
      key: "referralCode",
      label: "Referral code",
      type: "string",
      hint: "The ref= value from an affiliate's link.",
    },
    {
      key: "trackingId",
      label: "Tracking id",
      type: "string",
      hint: "Retrieved from Tapfiliate's javascript library.",
    },
    { key: "clickId", label: "Click id", type: "string" },
    { key: "assetId", label: "Asset id", type: "string" },
    { key: "sourceId", label: "Source id", type: "string" },
    {
      key: "status",
      label: "Initial status",
      type: "string",
      hint: 'Defaults to "new" if omitted.',
    },
    {
      key: "userAgent",
      label: "User agent",
      type: "string",
      hint: "For statistics and fraud detection.",
    },
    { key: "ip", label: "IP address", type: "string", hint: "For fraud detection." },
    metaDataParam,
    {
      key: "overrideMaxCookieTime",
      label: "Override max cookie time",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tapfiliate-generated customer id" },
    { key: "customer_id", type: "string", label: "Your own id, echoed back" },
    { key: "status", type: "string", label: "Resulting status" },
    { key: "program", type: "object", label: "The program the customer was attributed to" },
    {
      key: "affiliate",
      type: "object",
      label: "The referring affiliate, if attribution succeeded",
    },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json("/customers/", {
      method: "POST",
      query: compact({ override_max_cookie_time: boolStr(input.overrideMaxCookieTime) }),
      body: compact({
        customer_id: input.customerId,
        coupon: input.coupon,
        referral_code: input.referralCode,
        tracking_id: input.trackingId,
        click_id: input.clickId,
        asset_id: input.assetId,
        source_id: input.sourceId,
        status: input.status,
        user_agent: input.userAgent,
        ip: input.ip,
        meta_data: input.metaData,
      }),
    });
  },
};

export default customerCreate;
