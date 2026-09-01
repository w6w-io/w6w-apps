import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";

/**
 * `GET /v1/calendars/get` — the calendar the connected API key is scoped to.
 * No params: Luma keys are calendar-scoped, so there is nothing to select.
 */
type Input = Record<string, never>;

const calendarGet: ActionDefinition<Input> = {
  key: "calendar-get",
  type: "read",
  resource: "calendar",
  title: "Get Calendar",
  description: "Return the calendar this connection's API key is scoped to.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "url", type: "string", label: "URL" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(_input, ctx) {
    return new LumaClient(ctx).json("/v1/calendars/get");
  },
};

export default calendarGet;
