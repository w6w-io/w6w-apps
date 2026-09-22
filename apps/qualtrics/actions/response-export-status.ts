import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { idParam, surveyIdParam } from "../lib/params.ts";

interface Input {
  surveyId: string;
  progressId: string;
}

/**
 * `GET /API/v3/surveys/{surveyId}/export-responses/{progressId}` — poll an
 * export job started by Response Export Start.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). Per
 * public Qualtrics docs the response is `{percentComplete, status, fileId?}`;
 * `fileId` appears once `status` is `complete`, and that id is what Response
 * Export File needs.
 */
const responseExportStatus: ActionDefinition<Input> = {
  key: "response-export-status",
  type: "read",
  resource: "response-export",
  title: "Response Export Status",
  description: "Poll the progress of a response export job.",
  params: [
    surveyIdParam,
    idParam(
      "progressId",
      "Progress ID",
      "Returned by Start Response Export, and stable for the life of that job.",
    ),
  ],
  output: [
    { key: "percentComplete", type: "number", label: "Percent complete" },
    { key: "status", type: "string", label: "Job status (`inProgress`, `complete`, `failed`)" },
    { key: "fileId", type: "string", label: "File ID, once the job is complete" },
  ],

  async execute(input, ctx) {
    return await new QualtricsClient(ctx).request(
      `/surveys/${encodeId(input.surveyId)}/export-responses/${encodeId(input.progressId)}`,
    );
  },
};

export default responseExportStatus;
