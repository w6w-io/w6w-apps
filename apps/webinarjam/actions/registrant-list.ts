import type { ActionDefinition } from "@w6w/types";
import { type Product, PRODUCT_OPTIONS, WebinarJamClient } from "../lib/client.ts";

/**
 * `POST /{product}/registrants` — "get a list of registrants and attendees".
 * Verified against WebinarJam (article 15370152) and EverWebinar (15370157)
 * for the request fields; both articles' own field TABLE describes a flat,
 * all-integer response shape, but both articles' "Example return" is a
 * SCREENSHOT (not rendered as text on either page) showing something
 * structurally different and identical between the two products — see
 * `lib/client.ts`'s module doc for the full comparison. `RegistrantRow` below
 * is modelled on that screenshot, not the stale field table.
 *
 * `data.schedule`/`data.event` are formatted date STRINGS in the real
 * response ("Fri, 31 Oct 2025, 12:00 PM"), not the numeric schedule id the
 * table implies — `registrant-create`'s `schedule` param is the id; nothing
 * on this row is.
 */
interface RegistrantRow {
  id?: number;
  lead_id?: number;
  schedule_id?: number;
  event_id?: number;
  first_name?: string;
  last_name?: string;
  phone_country_code?: string;
  phone_number?: string;
  email?: string;
  ip?: string;
  webinar?: string;
  schedule?: string;
  event?: string;
  signup_date?: string;
  attended_live?: string;
  date_live?: string;
  entered_live?: string;
  time_live?: string;
  purchased_live?: string;
  revenue_live?: number;
  attended_replay?: string;
  date_replay?: string;
  time_replay?: string;
  purchased_replay?: string;
  revenue_replay?: number;
  subscribed?: string;
  gdpr_status?: string;
  gdpr_communications?: string;
  gdpr_status_date?: string;
  gdpr_status_ip?: string;
  twilio_consented_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  links?: { live_room?: string; replay_room?: string; unsubscribe?: string };
}

/**
 * Only `current_page` and `data` were actually visible in the vendor's example
 * screenshot (it scrolls off before any `total`/`last_page`/`per_page` field
 * would appear). Declaring only what was observed rather than assuming the
 * rest of a typical Laravel paginator is present.
 */
interface RegistrantsPage {
  current_page?: number;
  data?: RegistrantRow[];
}

interface Response {
  status?: string;
  registrants?: RegistrantsPage;
}

interface Input {
  product: Product;
  webinarId: number;
  scheduleId?: number;
  attendedLive?: number;
  attendedReplay?: number;
  purchased?: number;
  page?: number;
  attendedLiveTimestamp?: number;
  attendedReplayTimestamp?: number;
  dateRange?: number;
  search?: string;
}

const ATTENDANCE_OPTIONS = [
  { value: 0, label: "All registrants" },
  { value: 1, label: "Attended" },
  { value: 2, label: "Did not attend" },
  { value: 3, label: "Attended, left before timestamp" },
  { value: 4, label: "Attended, left after timestamp" },
];

const PURCHASED_OPTIONS = [
  { value: 0, label: "All registrants" },
  { value: 1, label: "Purchased" },
  { value: 2, label: "Did not purchase" },
];

const DATE_RANGE_OPTIONS = [
  { value: 0, label: "All time" },
  { value: 1, label: "Today" },
  { value: 2, label: "Yesterday" },
  { value: 3, label: "This week" },
  { value: 4, label: "Last week" },
  { value: 5, label: "Last 7 days" },
  { value: 6, label: "This month" },
  { value: 7, label: "Last month" },
  { value: 8, label: "Last 30 days" },
];

const registrantList: ActionDefinition<Input> = {
  key: "registrant-list",
  type: "search",
  resource: "registrant",
  title: "List Registrants",
  description: "List registrants and attendees for a webinar, with attendance/purchase filters.",
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      required: true,
      default: "webinarjam",
      options: PRODUCT_OPTIONS,
    },
    { key: "webinarId", label: "Webinar ID", type: "number", required: true },
    {
      key: "scheduleId",
      label: "Schedule ID",
      type: "number",
      hint: "The API-generated schedule id from Get Webinar. One schedule id may cover an entire " +
        "series — use Date range to pinpoint one session within it.",
    },
    {
      key: "attendedLive",
      label: "Live attendance",
      type: "select",
      options: ATTENDANCE_OPTIONS,
      advanced: true,
    },
    {
      key: "attendedReplay",
      label: "Replay attendance",
      type: "select",
      options: ATTENDANCE_OPTIONS,
      advanced: true,
    },
    {
      key: "purchased",
      label: "Purchase status",
      type: "select",
      options: PURCHASED_OPTIONS,
      advanced: true,
    },
    { key: "page", label: "Page", type: "number", default: 1, validation: { min: 1 } },
    {
      key: "attendedLiveTimestamp",
      label: "Live attendance timestamp (seconds)",
      type: "number",
      advanced: true,
      hint: "Used with Live attendance options 3/4.",
    },
    {
      key: "attendedReplayTimestamp",
      label: "Replay attendance timestamp (seconds)",
      type: "number",
      advanced: true,
      hint: "Used with Replay attendance options 3/4.",
    },
    {
      key: "dateRange",
      label: "Date range",
      type: "select",
      options: DATE_RANGE_OPTIONS,
      advanced: true,
    },
    { key: "search", label: "Search", type: "string", advanced: true },
  ],
  output: [
    { key: "currentPage", type: "number", label: "Current page" },
    { key: "registrants", type: "array", label: "Registrants" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarJamClient(ctx).request<Response>(input.product, "/registrants", {
      webinar_id: input.webinarId,
      schedule_id: input.scheduleId,
      attended_live: input.attendedLive,
      attended_replay: input.attendedReplay,
      purchased: input.purchased,
      page: input.page,
      attended_live_timestamp: input.attendedLiveTimestamp,
      attended_replay_timestamp: input.attendedReplayTimestamp,
      date_range: input.dateRange,
      search: input.search,
    });
    return {
      currentPage: body.registrants?.current_page ?? null,
      registrants: body.registrants?.data ?? [],
    };
  },
};

export default registrantList;
