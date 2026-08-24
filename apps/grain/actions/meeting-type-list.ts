import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";

interface Output {
  meetingTypes: unknown[];
}

/**
 * `POST /_/public-api/v2/meeting_types` — the workspace's meeting types
 * (`{ id, name, scope }` each, `scope` one of `internal` / `external`). No
 * params, no pagination documented.
 */
const meetingTypeList: ActionDefinition<Record<string, never>, Output> = {
  key: "meeting-type-list",
  type: "search",
  resource: "meeting-type",
  title: "List Meeting Types",
  description: "List the workspace's meeting types.",
  params: [],
  output: [{ key: "meetingTypes", type: "array", label: "Meeting types (id, name, scope)" }],

  async execute(_input, ctx) {
    const result = await new GrainClient(ctx).request<{ meeting_types?: unknown[] }>(
      "/v2/meeting_types",
      { method: "POST", body: {} },
    );
    return { meetingTypes: result?.meeting_types ?? [] };
  },
};

export default meetingTypeList;
