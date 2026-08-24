import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, matterIdFilterParam, paginationParams, refParam } from "../lib/params.ts";

/** `GET /calendar_entries.json` */
interface Input {
  calendarId?: number;
  matterId?: number;
  from?: string;
  to?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const calendarEntryList: ActionDefinition<Input> = {
  key: "calendar-entry-list",
  type: "search",
  resource: "calendar-entry",
  title: "List Calendar Entries",
  description: "List calendar entries, optionally filtered by calendar, matter or a time range.",
  params: [
    refParam("calendarId", "Calendar ID"),
    matterIdFilterParam,
    {
      key: "from",
      label: "From",
      type: "datetime",
      hint: "Only entries that END on or after this time.",
    },
    {
      key: "to",
      label: "To",
      type: "datetime",
      hint: "Only entries that BEGIN on or before this time.",
    },
    fieldsParam(
      "id,etag,summary,description,start_at,end_at,all_day,location,matter{id,display_number}",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Calendar entries" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/calendar_entries.json", {
      query: {
        calendar_id: input.calendarId,
        matter_id: input.matterId,
        from: input.from,
        to: input.to,
        fields: input.fields,
        limit: input.limit,
        page_token: input.pageToken,
      },
    });
  },
};

export default calendarEntryList;
