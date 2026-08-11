import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient, stripSecrets } from "../lib/client.ts";

/**
 * `GET /file/{file_id}` — one file's metadata.
 *
 * Metadata, not bytes: `name`, `mimetype`, `size`, `rights`, and three URLs —
 * `link` (download), `perma_link`, `thumbnail_link`. This app returns those
 * links; it does not follow them. Fetching the content would mean streaming an
 * arbitrary binary through a workflow step, which the action result — a JSON
 * document persisted in the run record — cannot carry.
 *
 * `link` is Podio's own host and is authenticated: it is not a public URL, so
 * handing it to a downstream service that has no Podio credential will not
 * work. That is a property of Podio's file links, not of this action.
 *
 * The `push` channel signature is stripped; see `lib/client.ts#REDACTED_FIELDS`.
 */
interface Input {
  fileId: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description:
    "One file's metadata and its download, permalink and thumbnail URLs. Returns links, " +
    "not bytes — and those links are authenticated, so a service outside Podio cannot " +
    "follow them.",
  params: [
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      required: true,
      hint: "Numeric file_id, e.g. from an item's file field or a comment's files list.",
    },
  ],
  output: [{ key: "file", type: "object", label: "File metadata" }],

  async execute(input, ctx) {
    const file = await new PodioClient(ctx).json<Record<string, unknown>>(
      `/file/${encodeSegment(input.fileId)}`,
    );
    return { file: stripSecrets(file ?? {}) };
  },
};

export default fileGet;
