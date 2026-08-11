import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, flag, PodioClient } from "../lib/client.ts";
import { refIdParam, refTypeParam } from "../lib/params.ts";

/**
 * `POST /file/{file_id}/attach` — "Attaches the uploaded file to the given
 * object. Valid objects are `status`, `item`, `comment`, `space`, or `task`."
 *
 * The second half of Podio's two-step file model: a file is uploaded first
 * (which produces a `file_id` belonging to nothing), then attached. This app
 * implements only the attach half — see the README for why the upload half is
 * absent — so this action is for file ids that already exist, typically ones
 * read off another item or comment.
 *
 * Idempotent: attaching a file that is already attached to the same object
 * converges on the same state.
 *
 * The endpoint returns no body; this action reports the HTTP status.
 */
interface Input {
  fileId: string;
  refType: string;
  refId: string;
  silent?: boolean;
}

const ATTACHABLE = ["item", "comment", "task", "status", "space"];

const fileAttach: ActionDefinition<Input> = {
  key: "file-attach",
  type: "perform",
  resource: "file",
  title: "Attach File",
  description: "Attach a file that already exists in Podio to an item, comment, task, status or " +
    "workspace. This app does not upload files — see the README.",
  idempotent: true,
  params: [
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      required: true,
      hint: "Numeric file_id of a file already in Podio.",
    },
    refTypeParam(ATTACHABLE, "What to attach the file to.", "refType", "Attach to (type)"),
    refIdParam("refId", "Attach to (id)"),
    {
      key: "silent",
      label: "Silent",
      type: "boolean",
      advanced: true,
      hint: "Podio defaults to false. True keeps the change out of the activity stream.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PodioClient(ctx).status(
      `/file/${encodeSegment(input.fileId)}/attach`,
      {
        method: "POST",
        body: { ref_type: input.refType, ref_id: input.refId },
        query: { silent: flag(input.silent) },
      },
    );
    return { status };
  },
};

export default fileAttach;
