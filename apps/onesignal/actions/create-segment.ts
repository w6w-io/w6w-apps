import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  name: string;
  filters: unknown;
  description?: string;
}

/**
 * `POST /apps/{app_id}/segments` — verified against the OpenAPI document
 * (`name` + `filters` required). `filters` uses the same AND/OR filter-array
 * grammar as Create Message's inline `filters` field.
 */
const createSegment: ActionDefinition<Input> = {
  key: "create-segment",
  type: "perform",
  resource: "segment",
  title: "Create Segment",
  description: "Define a new Segment from a filter expression.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      required: true,
      hint: 'e.g. [{"field":"tag","key":"level","relation":"=","value":"10"}]',
    },
    { key: "description", label: "Description", type: "string", default: "", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "success", type: "boolean", label: "Created" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const body = compact({
      name: input.name,
      description: input.description,
      filters: asOptionalJson(input.filters, "filters"),
    });
    return new OneSignalClient(ctx).json(`/apps/${encodeURIComponent(appId)}/segments`, {
      method: "POST",
      body,
    });
  },
};

export default createSegment;
