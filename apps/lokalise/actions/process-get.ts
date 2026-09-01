import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/processes/{process_id}` — poll a queued
 * process (a `file-upload` import, a Sketch import, or a bulk translation-
 * memory apply) started elsewhere.
 *
 * `status` is one of `queued`, `pre_processing`, `running`, `post_processing`,
 * `cancelled`, `finished` or `failed` — this action returns it verbatim
 * rather than collapsing it, since "queued" and "running" call for different
 * polling backoffs.
 */
interface Input {
  projectId: string;
  processId: string;
}

const processGet: ActionDefinition<Input> = {
  key: "process-get",
  type: "read",
  resource: "file",
  title: "Get Process",
  description: "Check the status of an async process, such as a queued file import.",
  params: [
    projectIdParam,
    {
      key: "processId",
      label: "Process ID",
      type: "string",
      required: true,
      hint: "From the `process.process_id` field of an Upload File response.",
    },
  ],
  output: [
    { key: "process_id", type: "string", label: "Process ID" },
    { key: "type", type: "string", label: "Process type" },
    {
      key: "status",
      type: "string",
      label: "queued | pre_processing | running | post_processing | cancelled | finished | failed",
    },
    { key: "message", type: "string", label: "Status message, e.g. an error detail on failure" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/processes/${encodeId(input.processId)}`,
    );
  },
};

export default processGet;
