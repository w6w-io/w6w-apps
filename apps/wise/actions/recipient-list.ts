import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { recipientPaginationParams } from "../lib/params.ts";

/**
 * `GET /accounts` — the user's recipient (beneficiary) accounts.
 *
 * ## A paged envelope, not a bare array
 *
 * Unlike Profile List, Transfer List, Balance List, Rate History or Currency
 * List (all bare JSON arrays in this API), this endpoint answers
 * `{content, seekPositionForNext, seekPositionForCurrent, sort, size}` — one
 * of the two response shapes Wise mixes across its list endpoints. This
 * action passes `content` through as `items` and surfaces the seek cursor
 * separately so a caller can page without reading the raw envelope.
 *
 * ## A documented auth-scope gap
 *
 * The OpenAPI bundle's `security` for this operation lists **`UserToken`
 * only** — no `PersonalToken` — even though the personal-API-token guide
 * states a personal token covers "retrieving and creating recipients". See
 * `auth/api-token.ts` for the full discrepancy.
 */
interface Input {
  profile?: number;
  currency?: string;
  type?: string;
  active?: boolean;
  ownedByCustomer?: boolean;
  size?: number;
  seekPosition?: number;
  sort?: string;
}

interface RecipientListResponse {
  content?: unknown[];
  seekPositionForNext?: number;
  seekPositionForCurrent?: number;
  size?: number;
}

const recipientList: ActionDefinition<Input> = {
  key: "recipient-list",
  type: "search",
  resource: "recipient",
  title: "List Recipients",
  description: "List the recipient (beneficiary) accounts this profile has created.",
  params: [
    {
      key: "profile",
      label: "Profile ID",
      type: "number",
      hint: "Filters by owning profile. Defaults to the personal profile if omitted.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "Filter by the recipient's target currency (3-letter ISO 4217 code).",
    },
    {
      key: "type",
      label: "Account type",
      type: "string",
      hint: "Filter by account type, e.g. iban, sort_code. Comma-separate multiple types.",
    },
    {
      key: "active",
      label: "Active only",
      type: "boolean",
      default: true,
      hint: "Defaults to true, matching the API.",
    },
    {
      key: "ownedByCustomer",
      label: "Owned by customer",
      type: "boolean",
      hint: "Leave empty to return every recipient regardless of ownership.",
    },
    ...recipientPaginationParams,
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "id,asc",
      hint: "Comma-separated: id or currency, then asc or desc.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Recipient accounts" },
    { key: "seekPositionForNext", type: "number", label: "Pass as seekPosition for the next page" },
  ],

  async execute(input, ctx) {
    const res = await new WiseClient(ctx).json<RecipientListResponse>("/accounts", {
      query: {
        profile: input.profile,
        currency: input.currency,
        type: input.type,
        active: input.active,
        ownedByCustomer: input.ownedByCustomer,
        size: input.size,
        seekPosition: input.seekPosition,
        sort: input.sort,
      },
    });
    return {
      items: res.content ?? [],
      seekPositionForNext: res.seekPositionForNext,
      seekPositionForCurrent: res.seekPositionForCurrent,
    };
  },
};

export default recipientList;
