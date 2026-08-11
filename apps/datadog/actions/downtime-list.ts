import type { ActionDefinition } from "@w6w/types";
import { DatadogClient } from "../lib/client.ts";

/**
 * `GET /api/v2/downtime` — scheduled downtimes.
 *
 * Downtime v2, not v1. Datadog deprecated the v1 downtime endpoints
 * (`GET /api/v1/monitor/{id}/downtimes` carries `deprecated: true` with the note
 * "Please use v2 endpoints") and routed the rest through it — even
 * `POST /api/v1/host/{host}/mute` is documented as creating a Downtime V2 behind
 * the scenes. So v2 is the only surface this app speaks.
 *
 * Two consequences of that migration show up here:
 *
 *  - **Ids are UUIDs**, not the integers v1 used.
 *  - **Errors are JSON:API-shaped** — `{"errors": [{status, title, detail}]}`,
 *    objects rather than the strings v1 returns. `lib/client.ts` reads both.
 *
 * `current_only` is the parameter people actually want: without it the list
 * includes expired and cancelled downtimes, and a cancelled one lingers in
 * results for about two days before it is purged.
 *
 * Needs the application key and the `monitors_downtime` scope.
 */
interface Input {
  currentOnly?: boolean;
  include?: string;
  offset?: number;
  limit?: number;
}

const downtimeList: ActionDefinition<Input> = {
  key: "downtime-list",
  type: "search",
  resource: "downtime",
  title: "List Downtimes",
  description: "List scheduled downtimes, optionally only the ones active right now.",
  params: [
    {
      key: "currentOnly",
      label: "Only active now",
      type: "boolean",
      hint: "Off by default, matching the API — which means expired and recently-cancelled " +
        "downtimes are included. A cancelled downtime is retained for about two days.",
    },
    {
      key: "include",
      label: "Include related",
      type: "string",
      advanced: true,
      placeholder: "created_by,monitor",
      hint: "Comma-separated. Only `created_by` and `monitor` are supported; they arrive in the " +
        "response's `included` array.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Datadog's own default is 0. This endpoint pages by offset, not by cursor.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 30,
      validation: { integer: true, min: 1 },
      hint: "Datadog's own default is 30.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Downtimes" },
    { key: "included", type: "array", label: "Related monitors and users, when requested" },
    { key: "meta", type: "object", label: "Paging metadata" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json("/api/v2/downtime", {
      query: {
        current_only: input.currentOnly === true ? "true" : undefined,
        include: input.include,
        "page[offset]": input.offset,
        "page[limit]": input.limit,
      },
    });
  },
};

export default downtimeList;
