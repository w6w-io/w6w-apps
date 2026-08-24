import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `GET /calendar_entries/{id}.json` */
interface Input {
  id: number;
  fields?: string;
}

const calendarEntryGet: ActionDefinition<Input> = {
  key: "calendar-entry-get",
  type: "read",
  resource: "calendar-entry",
  title: "Get Calendar Entry",
  description: "Fetch one calendar entry by id.",
  params: [
    idParam("Calendar entry ID"),
    fieldsParam(
      "id,etag,summary,description,start_at,end_at,all_day,location,matter{id,display_number}",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The calendar entry" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/calendar_entries/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default calendarEntryGet;
