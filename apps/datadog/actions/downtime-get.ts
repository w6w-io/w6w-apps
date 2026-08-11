import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";

/**
 * `GET /api/v2/downtime/{downtime_id}` — one downtime.
 *
 * The id is a **UUID** (`00000000-0000-1234-0000-000000000000` in Datadog's own
 * example), not the integer the deprecated v1 downtime API used. An integer id
 * copied from old tooling 404s here.
 *
 * A cancelled downtime still resolves for roughly two days before Datadog purges
 * it, so a 200 does not mean the downtime is in force — read
 * `data.attributes.status`.
 *
 * Needs the application key and the `monitors_downtime` scope.
 */
interface Input {
  downtimeId: string;
  include?: string;
}

const downtimeGet: ActionDefinition<Input> = {
  key: "downtime-get",
  type: "read",
  resource: "downtime",
  title: "Get Downtime",
  description: "Fetch one scheduled downtime by its UUID.",
  params: [
    {
      key: "downtimeId",
      label: "Downtime ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-1234-0000-000000000000",
      hint: "A UUID. Downtime v2 does not use the numeric ids the deprecated v1 API returned.",
    },
    {
      key: "include",
      label: "Include related",
      type: "string",
      advanced: true,
      placeholder: "created_by,monitor",
      hint: "Comma-separated. Only `created_by` and `monitor` are supported.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The downtime" },
    { key: "included", type: "array", label: "Related monitor and creator, when requested" },
  ],

  execute(input, ctx) {
    return new DatadogClient(ctx).json(`/api/v2/downtime/${encodeSegment(input.downtimeId)}`, {
      query: { include: input.include },
    });
  },
};

export default downtimeGet;
