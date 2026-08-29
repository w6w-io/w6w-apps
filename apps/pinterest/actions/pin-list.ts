import type { ActionDefinition } from "@w6w/types";
import { PinterestClient, type PinterestListPage } from "../lib/client.ts";
import { adAccountIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v5/pins` — every Pin owned by the connected account, regardless of
 * which board it is on.
 *
 * `pin_filter` (`PinFilter`: `exclude_native`, `exclude_repins`,
 * `has_been_promoted`) is Pinterest's own enum, copied verbatim from the
 * OpenAPI description rather than guessed.
 */
interface Input {
  pinFilter?: string;
  linkDomain?: string;
  includeProtectedPins?: boolean;
  adAccountId?: string;
  pageSize?: number;
  bookmark?: string;
}

const pinList: ActionDefinition<Input> = {
  key: "pin-list",
  type: "search",
  resource: "pin",
  title: "List Pins",
  description: "List every Pin owned by the connected account.",
  params: [
    {
      key: "pinFilter",
      label: "Filter",
      type: "select",
      options: [
        { value: "exclude_native", label: "Exclude native Pins" },
        { value: "exclude_repins", label: "Exclude re-pins (saved from elsewhere)" },
        { value: "has_been_promoted", label: "Only Pins that have been promoted" },
      ],
      advanced: true,
    },
    {
      key: "linkDomain",
      label: "Link domain",
      type: "string",
      advanced: true,
      hint: 'Only return Pins whose link matches this exact domain (no "www." prefix).',
    },
    {
      key: "includeProtectedPins",
      label: "Include protected-board Pins",
      type: "boolean",
      advanced: true,
    },
    adAccountIdParam,
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Pins" },
    { key: "bookmark", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json<PinterestListPage<unknown>>(`/pins`, {
      query: {
        pin_filter: input.pinFilter,
        domain: input.linkDomain,
        include_protected_pins: input.includeProtectedPins,
        ad_account_id: input.adAccountId,
        ...paginationQuery(input),
      },
    });
  },
};

export default pinList;
