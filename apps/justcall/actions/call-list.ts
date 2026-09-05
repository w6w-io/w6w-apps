import type { ActionDefinition } from "@w6w/types";
import { JustCallClient, toList } from "../lib/client.ts";
import {
  CALL_DIRECTIONS,
  CALL_TRAITS,
  CALL_TYPES,
  ORDER_ASC_DESC,
  PAGE,
  PAGINATION_OUTPUT,
  perPage,
  toSelectOptions,
} from "../lib/params.ts";

/**
 * `GET /v2.1/calls` — verified against `call_list_v21`'s embedded OpenAPI
 * fragment, 2026-09-05.
 *
 * History is retained for **the last 3 months** via this endpoint per the
 * vendor's own note; a one-time full export requires contacting JustCall
 * directly.
 *
 * `contact_number`, `justcall_number` and `ivr_digit` are all typed `number` in
 * the vendor's own OpenAPI schema — a phone number modeled as a JS number is
 * documented here as-is (not corrected to `string`) because the vendor's own
 * validation expects the same numeric form; a leading `+` should be omitted.
 */
interface Input {
  agent_id?: number;
  ai_agent_ids?: string[] | string;
  call_direction?: string;
  call_traits?: string[] | string;
  call_type?: string;
  contact_number?: number;
  disposition_codes?: string[] | string;
  fetch_ai_data?: boolean;
  fetch_queue_data?: boolean;
  from_datetime?: string;
  ivr_digit?: number;
  justcall_number?: number;
  last_call_id_fetched?: number;
  order?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  to_datetime?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description:
    "Retrieve calls linked to the account, optionally filtered by agent, direction, type, date " +
    "range and more. History is retained for the last 3 months via this endpoint.",
  params: [
    { key: "agent_id", label: "Agent ID", type: "number", hint: "From the List all users action." },
    {
      key: "ai_agent_ids",
      label: "AI agent IDs",
      type: "string",
      hint: "Comma-separated AI agent IDs, from the List all voice agents endpoint.",
    },
    {
      key: "call_direction",
      label: "Direction",
      type: "select",
      options: toSelectOptions(CALL_DIRECTIONS),
    },
    {
      key: "call_traits",
      label: "Call traits",
      type: "multiselect",
      options: toSelectOptions(CALL_TRAITS),
      hint: "Overrides call_direction/call_type when set, per the vendor's own note.",
    },
    { key: "call_type", label: "Call type", type: "select", options: toSelectOptions(CALL_TYPES) },
    {
      key: "contact_number",
      label: "Contact number",
      type: "string",
      hint: "Digits only, with country code, no leading '+' (sent as a number on the wire).",
    },
    {
      key: "disposition_codes",
      label: "Disposition codes",
      type: "string",
      hint: 'Comma-separated codes already present in your account, e.g. "Sales: Follow Up". ' +
        "Matches calls with any of the listed dispositions.",
    },
    {
      key: "fetch_ai_data",
      label: "Include JustCall AI data",
      type: "boolean",
      default: false,
    },
    {
      key: "fetch_queue_data",
      label: "Include queue/callback data",
      type: "boolean",
      default: false,
    },
    {
      key: "from_datetime",
      label: "From",
      type: "string",
      hint: "yyyy-mm-dd hh:mm:ss or yyyy-mm-dd, in the account's timezone.",
    },
    {
      key: "to_datetime",
      label: "To",
      type: "string",
      hint: "yyyy-mm-dd hh:mm:ss or yyyy-mm-dd, in the account's timezone.",
    },
    {
      key: "ivr_digit",
      label: "IVR digit",
      type: "number",
      hint: "Disables call_direction/call_type filters when set, per the vendor's own note.",
    },
    { key: "justcall_number", label: "JustCall number", type: "string" },
    {
      key: "last_call_id_fetched",
      label: "Last call ID fetched",
      type: "number",
      hint: "Pair with next_page_link to avoid duplicate rows across pages.",
    },
    ORDER_ASC_DESC,
    PAGE,
    perPage(20, 100),
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [{ label: "ID", value: "id" }, { label: "Date/time", value: "datetime" }],
      default: "id",
    },
  ],
  output: PAGINATION_OUTPUT,

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/calls", {
      query: {
        agent_id: input.agent_id,
        ai_agent_ids: toList(input.ai_agent_ids),
        call_direction: input.call_direction,
        call_traits: toList(input.call_traits),
        call_type: input.call_type,
        contact_number: input.contact_number,
        disposition_codes: toList(input.disposition_codes),
        fetch_ai_data: input.fetch_ai_data,
        fetch_queue_data: input.fetch_queue_data,
        from_datetime: input.from_datetime,
        ivr_digit: input.ivr_digit,
        justcall_number: input.justcall_number,
        last_call_id_fetched: input.last_call_id_fetched,
        order: input.order,
        page: input.page,
        per_page: input.per_page,
        sort: input.sort,
        to_datetime: input.to_datetime,
      },
    });
    return body;
  },
};

export default callList;
