import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { SEGMENT_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /segments/{id}` — verified against Mautic's REST API docs
 * (`segments.html`, "Get Segment").
 */
const action: ActionDefinition = {
  key: "segment-get",
  type: "read",
  resource: "segment",
  title: "Get a segment",
  description: "Retrieve a single segment by ID, including its filter criteria.",
  params: [SEGMENT_ID_PARAM],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.segmentId);
    if (!Number.isFinite(id)) throw new Error("`segmentId` must be a number");

    ctx.log("info", "getting a Mautic segment", { id });

    const body = await new MauticClient(ctx).request<{ list: unknown }>(`/segments/${id}`);
    return body.list;
  },
};

export default action;
