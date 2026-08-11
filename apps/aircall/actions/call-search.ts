import type { ActionDefinition } from "@w6w/types";
import { AircallClient, flag, toIdList } from "../lib/client.ts";
import {
  callDirectionOptions,
  type CallExpansionInput,
  callExpansionParams,
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput, WindowInput, CallExpansionInput {
  direction?: string;
  userId?: string;
  phoneNumber?: string;
  tags?: string[] | string;
}

/**
 * `GET /v1/calls/search` — Calls filtered by direction, user, phone number or
 * tags.
 *
 * Two behaviours that are easy to misread:
 *
 *  - **`tags` is an AND, not an OR.** Aircall: "Implemented as an AND condition:
 *    Aircall will search for Calls matching all the tags present in this array."
 *    Passing three tag ids returns only calls carrying all three.
 *  - **A transferred call is indexed under the destination, not the origin.**
 *    Aircall: "Given a call transferred between A and B phone numbers, the call
 *    will not appear when filtering by A but it will for B." A `phoneNumber`
 *    search therefore under-reports transferred traffic by design.
 *
 * The `tags` array reaches the wire as a repeated `tags[]` key, which is how the
 * vendor's array params are shaped; comma-joining them matches nothing.
 */
const callSearch: ActionDefinition<Input> = {
  key: "call-search",
  type: "search",
  resource: "call",
  title: "Search Calls",
  description:
    "Find Calls by direction, user, phone number or tags. Tags are ANDed; transferred calls index " +
    "under the transfer destination.",
  params: [
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: callDirectionOptions,
      hint: "Leave empty for both.",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      placeholder: "456",
      hint: "Numeric ID of the User who made or received the Calls.",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      placeholder: "+18001231234",
      hint: "The calling or receiving number. A call transferred from this number to another is " +
        "indexed under the destination, so it will NOT match here.",
    },
    {
      key: "tags",
      label: "Tag IDs",
      type: "multiselect",
      hint:
        "Numeric Tag IDs. Combined with AND — a Call must carry every tag listed to match. Use " +
        "the List Tags action to find the IDs.",
    },
    ...windowParams("Calls"),
    ...callExpansionParams(),
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/calls/search", "calls", {
      query: {
        ...windowQuery(input),
        ...paginationQuery(input),
        direction: input.direction,
        user_id: input.userId,
        phone_number: input.phoneNumber,
        tags: toIdList(input.tags),
        fetch_contact: flag(input.fetchContact),
        fetch_short_urls: flag(input.fetchShortUrls),
        fetch_call_timeline: flag(input.fetchCallTimeline),
        fetch_aiva_conv: flag(input.fetchAivaConv),
      },
    });
    return listResult(meta, items);
  },
};

export default callSearch;
