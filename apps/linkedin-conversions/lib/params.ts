import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and enum option lists for the LinkedIn
 * Conversions actions. Every enum here is transcribed from Microsoft
 * Learn's LinkedIn Marketing docs
 * (`integrations/ads-reporting/conversions-api-schema`, read 2026-09-05),
 * not inferred.
 */

export const accountIdParam: Param = {
  key: "accountId",
  label: "Ad Account ID",
  type: "string",
  required: true,
  placeholder: "512352200",
  hint: "The numeric Ad Account ID (from Campaign Manager's URL). Also accepts the full " +
    "urn:li:sponsoredAccount:{id} form.",
};

export const conversionIdParam: Param = {
  key: "conversionId",
  label: "Conversion Rule ID",
  type: "string",
  required: true,
  hint: "The numeric Conversion Rule ID — from conversion-rule-create's output, or " +
    "conversion-rule-list. Also accepts the full urn:lla:llaPartnerConversion:{id} form.",
};

export const campaignIdParam: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "string",
  required: true,
  hint: "The numeric Campaign ID. Also accepts the full urn:li:sponsoredCampaign:{id} form.",
};

/**
 * The full `type` enum for a Conversion Rule — what kind of action this
 * conversion represents. `MARKETING_QUALIFIED_LEAD` and
 * `SALES_QUALIFIED_LEAD` are supported only from API version 202608 on,
 * which is the version this app pins (see `lib/client.ts`).
 */
export const conversionTypeOptions = [
  { value: "ADD_TO_CART", label: "Add to cart" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "INSTALL", label: "Install" },
  { value: "KEY_PAGE_VIEW", label: "Key page view" },
  { value: "LEAD", label: "Lead" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SIGN_UP", label: "Sign up" },
  { value: "OTHER", label: "Other" },
  { value: "SAVE", label: "Save" },
  { value: "START_CHECKOUT", label: "Start checkout" },
  { value: "SCHEDULE", label: "Schedule" },
  { value: "VIEW_CONTENT", label: "View content" },
  { value: "VIEW_VIDEO", label: "View video" },
  { value: "ADD_BILLING_INFO", label: "Add billing info" },
  { value: "BOOK_APPOINTMENT", label: "Book appointment" },
  { value: "REQUEST_QUOTE", label: "Request quote" },
  { value: "SEARCH", label: "Search" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "AD_CLICK", label: "Ad click (3rd party ad)" },
  { value: "AD_VIEW", label: "Ad view" },
  { value: "COMPLETE_SIGNUP", label: "Complete signup" },
  { value: "SUBMIT_APPLICATION", label: "Submit application" },
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "INVITE", label: "Invite" },
  { value: "LOGIN", label: "Login" },
  { value: "SHARE", label: "Share" },
  { value: "DONATE", label: "Donate" },
  { value: "ADD_TO_LIST", label: "Add to wishlist" },
  { value: "START_TRIAL", label: "Start trial" },
  { value: "OUTBOUND_CLICK", label: "Outbound click" },
  { value: "CONTACT", label: "Contact" },
  { value: "QUALIFIED_LEAD", label: "Qualified lead" },
  {
    value: "MARKETING_QUALIFIED_LEAD",
    label: "Marketing qualified lead (API version 202608+ only)",
  },
  { value: "SALES_QUALIFIED_LEAD", label: "Sales qualified lead (API version 202608+ only)" },
];

export const attributionTypeOptions = [
  { value: "LAST_TOUCH_BY_CAMPAIGN", label: "Last touch by campaign (each campaign, default)" },
  { value: "LAST_TOUCH_BY_CONVERSION", label: "Last touch by conversion (single campaign)" },
];

export const valueTypeOptions = [
  { value: "DYNAMIC", label: "Dynamic (default) — use the value passed in each event" },
  { value: "FIXED", label: "Fixed — use the conversion rule's own value" },
  { value: "NO_VALUE", label: "No value" },
];

/**
 * Allowed attribution-window sizes, in days. `365` is documented as valid
 * only for a subset of conversion types (`SUBMIT_APPLICATION`, `PURCHASE`,
 * `ADD_TO_CART`, `QUALIFIED_LEAD`, `LEAD`) — not validated client-side,
 * since LinkedIn's own rejection message names the actual constraint.
 */
export const attributionWindowOptions = [
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  {
    value: 365,
    label: "365 days (LEAD/PURCHASE/ADD_TO_CART/QUALIFIED_LEAD/SUBMIT_APPLICATION only)",
  },
];

export const conversionOwnershipTypeOptions = [
  { value: "OWNED", label: "Owned — created in this ad account" },
  { value: "SHARED", label: "Shared — from another ad account under the same Business Manager" },
];

export const autoAssociationTypeOptions = [
  { value: "ALL_CAMPAIGNS", label: "All campaigns (up to 200, ACTIVE/PAUSED/DRAFT)" },
  {
    value: "OBJECTIVE_BASED",
    label: "Objective-based (campaigns whose objective maps to the type)",
  },
];
