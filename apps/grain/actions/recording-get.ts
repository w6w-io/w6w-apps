import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";
import {
  buildRecordingInclude,
  recordingIdParam,
  recordingIncludeParams,
  recordingOutput,
} from "../lib/params.ts";

/**
 * `POST /_/public-api/v2/recordings/:recording_id` — a single recording.
 * `POST`, not `GET`: the only body it takes is the `include` object, which
 * does not fit cleanly into query params.
 */
const recordingGet: ActionDefinition<Record<string, unknown>, Record<string, unknown>> = {
  key: "recording-get",
  type: "read",
  resource: "recording",
  title: "Get Recording",
  description: "Fetch a single recording by id, with optional includes.",
  params: [recordingIdParam, ...recordingIncludeParams],
  output: recordingOutput,

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    const include = buildRecordingInclude(input);
    if (include) body.include = include;

    const result = await new GrainClient(ctx).request<Record<string, unknown>>(
      `/v2/recordings/${encodeURIComponent(String(input.recordingId))}`,
      { method: "POST", body },
    );
    return result ?? {};
  },
};

export default recordingGet;
