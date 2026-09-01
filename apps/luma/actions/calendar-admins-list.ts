import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";

/** `GET /v1/calendars/admins/list`. No params, no pagination fields documented. */
type Input = Record<string, never>;

const calendarAdminsList: ActionDefinition<Input> = {
  key: "calendar-admins-list",
  type: "search",
  resource: "calendar",
  title: "List Calendar Admins",
  description: "List the admins of the connected calendar.",
  params: [],
  output: [
    { key: "entries", type: "array", label: "Admins" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  execute(_input, ctx) {
    return new LumaClient(ctx).list("/v1/calendars/admins/list");
  },
};

export default calendarAdminsList;
