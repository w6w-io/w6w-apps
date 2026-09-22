import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { surveyIdParam } from "../lib/params.ts";

interface Input {
  surveyId: string;
  format?: string;
}

/**
 * `POST /API/v3/surveys/{surveyId}/export-responses` — start an async response
 * export.
 *
 * Confirmed live on 2026-09-22: a bodyless POST gets an HTTP-layer `411 Length
 * Required` before app logic runs, which still proves the route is registered.
 * Per public Qualtrics docs the body is `{"format": "…"}` and the response
 * carries a `progressId` to poll.
 *
 * Qualtrics exports are a **three-beat** flow — start, poll with
 * Response Export Status, then download with Response Export File. This action
 * is the first beat.
 *
 * Each call starts a NEW job and returns a new `progressId`, so it is not
 * idempotent: marking it retryable would turn one dropped connection into two
 * exports running against the account's export quota.
 */
const responseExportStart: ActionDefinition<Input> = {
  key: "response-export-start",
  type: "perform",
  resource: "response-export",
  title: "Start Response Export",
  description: "Start an asynchronous export of a survey's responses.",
  idempotent: false,
  params: [
    surveyIdParam,
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "json",
      options: [
        { value: "json", label: "JSON" },
        { value: "csv", label: "CSV" },
        { value: "tsv", label: "TSV" },
        { value: "xml", label: "XML" },
      ],
      hint:
        "Formats documented by Qualtrics for this endpoint. The rest of Qualtrics' body options " +
        "(labels, display order, …) are not exposed here — only `format` was verified.",
    },
  ],
  output: [
    {
      key: "progressId",
      type: "string",
      label: "Progress ID, to poll with Response Export Status",
    },
    { key: "percentComplete", type: "number", label: "Percent complete" },
    { key: "status", type: "string", label: "Job status" },
  ],

  async execute(input, ctx) {
    return await new QualtricsClient(ctx).request(
      `/surveys/${encodeId(input.surveyId)}/export-responses`,
      { method: "POST", body: { format: input.format ?? "json" } },
    );
  },
};

export default responseExportStart;
