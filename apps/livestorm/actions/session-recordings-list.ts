import type { ActionDefinition } from "@w6w/types";
import { compact, listQuery, LivestormClient } from "../lib/client.ts";
import type { JsonApiListResponse } from "../lib/client.ts";

interface Input {
  id: string;
  pageNumber?: number;
  pageSize?: number;
  urlExpiresIn?: number;
}

const sessionRecordingsList: ActionDefinition<Input> = {
  key: "session-recordings-list",
  type: "search",
  resource: "session",
  title: "List Session Recordings",
  description: "List a session's recordings, with signed playback/download URLs.",
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "pageNumber", label: "Page number", type: "number", hint: "0-indexed." },
    { key: "pageSize", label: "Page size", type: "number" },
    {
      key: "urlExpiresIn",
      label: "Signed URL expiry (seconds)",
      type: "number",
      hint: "1 hour (3600) to 7 days (604800). Defaults to 12 hours (43200) if unset.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Recordings" },
    { key: "meta", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    return await new LivestormClient(ctx).request<JsonApiListResponse>(
      `/sessions/${encodeURIComponent(input.id)}/recordings`,
      { query: { ...listQuery(input), ...compact({ url_expires_in: input.urlExpiresIn }) } },
    );
  },
};

export default sessionRecordingsList;
