import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileIds?: string;
  search?: string;
  boundaryId?: string;
  boundaryStartsAt?: string;
  direction?: "forwards" | "backwards";
  jumpToDate?: string;
  displayTimeZone?: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,title,accountId,profileId,createdAt,startsAt,endsAt,location,tentative,timeZone,cancelled,numberOfSlots";

/**
 * GET /{accountId}/bookings — list bookings across the whole account,
 * optionally scoped to one or more booking pages. Cursor-paginated: pass the
 * `id`/`startsAt` of the last row back as `boundaryId`/`boundaryStartsAt` with
 * `direction` to page forwards or backwards, per the vendor's own
 * documentation (its Stoplight project's "Bookings Pagination" section,
 * fetched 2026-09-01) and the `Link` response header the live API exposes.
 */
const listBookings: ActionDefinition<Input, unknown[]> = {
  key: "list-bookings",
  type: "read",
  resource: "booking",
  title: "List Bookings",
  description: "List bookings for an account, optionally filtered by booking page (GET /bookings).",
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    {
      key: "profileIds",
      label: "Booking page IDs",
      type: "string",
      hint: "Comma-separated profile ids. Omit to list across every booking page.",
    },
    { key: "search", label: "Search", type: "string", hint: "Filter by a word in the booking." },
    {
      key: "boundaryId",
      label: "Boundary booking ID",
      type: "string",
      advanced: true,
      hint: "Pagination cursor — the id of the last booking from a previous page.",
    },
    {
      key: "boundaryStartsAt",
      label: "Boundary start time",
      type: "string",
      advanced: true,
      hint: "Pagination cursor — pair with Boundary booking ID.",
    },
    {
      key: "direction",
      label: "Page direction",
      type: "select",
      advanced: true,
      options: [
        { value: "forwards", label: "Forwards" },
        { value: "backwards", label: "Backwards" },
      ],
    },
    { key: "jumpToDate", label: "Jump to date", type: "date", advanced: true },
    { key: "displayTimeZone", label: "Display time zone", type: "string", advanced: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      advanced: true,
      default: DEFAULT_FIELDS,
      hint: "Comma-separated response fields, dotted for nested objects (e.g. answers.code).",
    },
  ],
  output: [{ key: "", type: "array", label: "Bookings" }],

  execute(input, ctx) {
    return new YouCanBookMeClient(ctx).request<unknown[]>(`/${input.accountId}/bookings`, {
      query: {
        profileIds: input.profileIds,
        search: input.search,
        boundaryId: input.boundaryId,
        boundaryStartsAt: input.boundaryStartsAt,
        direction: input.direction,
        jumpToDate: input.jumpToDate,
        displayTimeZone: input.displayTimeZone,
        fields: input.fields ?? DEFAULT_FIELDS,
      },
    });
  },
};

export default listBookings;
