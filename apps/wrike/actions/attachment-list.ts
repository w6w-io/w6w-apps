import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /tasks/{taskId}/attachments` — a task's attachment metadata (name,
 * size, uploader, version, download link).
 *
 * This app covers attachment **metadata** — list, get-by-id, get a fresh
 * download URL, and delete. Uploading a new attachment
 * (`POST /tasks/{taskId}/attachments`) is intentionally left out: Wrike's own
 * OpenAPI document for that endpoint declares no request body or content-type
 * at all, and the actual binary-upload contract (raw bytes plus a filename
 * header) is only described in prose elsewhere that this app's sourcing did
 * not confirm — see `README.md`.
 */
interface Input {
  taskId: string;
  versions?: boolean;
  withUrls?: boolean;
}

const attachmentList: ActionDefinition<Input> = {
  key: "attachment-list",
  type: "search",
  resource: "attachment",
  title: "List Task Attachments",
  description: "List attachment metadata for a task.",
  params: [
    taskIdParam,
    {
      key: "versions",
      label: "Include all versions",
      type: "boolean",
      hint: "Off by default — only the current version of each attachment.",
    },
    { key: "withUrls", label: "Include download/preview URLs", type: "boolean" },
  ],
  output: [{ key: "items", type: "array", label: "Attachments" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(
      `/tasks/${encodeURIComponent(input.taskId)}/attachments`,
      { query: { versions: input.versions, withUrls: input.withUrls } },
    );
    return { items };
  },
};

export default attachmentList;
