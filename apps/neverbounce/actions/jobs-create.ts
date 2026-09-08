import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  inputLocation: "remote_url" | "supplied";
  remoteUrl?: string;
  emails?: string[];
  names?: string[];
  ids?: string[];
  filename?: string;
  autoParse?: boolean;
  autoStart?: boolean;
  runSample?: boolean;
  allowManualReview?: boolean;
  leverageHistoricalData?: boolean;
  callbackUrl?: string;
}

/**
 * `POST /jobs/create` — create a bulk verification job, either from a remote
 * CSV URL or from rows supplied directly in the request. Source: the OAS
 * `operationId: jobs-create`, cross-checked against the JSON-encoded request
 * example in its `x-readme.code-samples` ("cURL Supplied Data"), which shapes
 * `input` as an array of `{id, email, name}` objects — the form this action
 * builds, since it is the one every language sample (Node.js, Python, C#)
 * also accepts.
 *
 * `perform`, not `read`: it creates a billable resource, and retrying blindly
 * would create a duplicate job — `idempotent: false`.
 */
const jobsCreate: ActionDefinition<Input> = {
  key: "jobs-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a bulk email verification job from a remote CSV URL or supplied rows.",
  idempotent: false,
  params: [
    {
      key: "inputLocation",
      label: "Input Source",
      type: "select",
      required: true,
      default: "supplied",
      options: [
        { value: "supplied", label: "Supplied rows" },
        { value: "remote_url", label: "Remote URL (CSV)" },
      ],
    },
    {
      key: "remoteUrl",
      label: "Remote CSV URL",
      type: "string",
      showIf: { "==": [{ "var": "inputLocation" }, "remote_url"] },
      hint: "A URL NeverBounce can fetch a CSV of emails from.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "string",
      repeat: true,
      showIf: { "==": [{ "var": "inputLocation" }, "supplied"] },
      hint: "The addresses to verify.",
    },
    {
      key: "names",
      label: "Names",
      type: "string",
      repeat: true,
      showIf: { "==": [{ "var": "inputLocation" }, "supplied"] },
      hint: "Optional, index-aligned with Emails.",
      advanced: true,
    },
    {
      key: "ids",
      label: "Row IDs",
      type: "string",
      repeat: true,
      showIf: { "==": [{ "var": "inputLocation" }, "supplied"] },
      hint: "Optional, index-aligned with Emails — your own identifier for each row, echoed back " +
        "in Get Job Results.",
      advanced: true,
    },
    {
      key: "filename",
      label: "Filename",
      type: "string",
      hint: "Shown in the NeverBounce dashboard when viewing this job.",
    },
    {
      key: "autoParse",
      label: "Auto-Parse",
      type: "boolean",
      default: false,
      hint: "Begin parsing the job immediately after creation.",
    },
    {
      key: "autoStart",
      label: "Auto-Start",
      type: "boolean",
      default: false,
      hint: "Run the job immediately after it's parsed. Requires Auto-Parse.",
    },
    {
      key: "runSample",
      label: "Run As Sample",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "allowManualReview",
      label: "Allow Manual Review",
      type: "boolean",
      default: false,
      hint: "Let ambiguous results fall into NeverBounce's manual review queue.",
      advanced: true,
    },
    {
      key: "leverageHistoricalData",
      label: "Use Historical Data",
      type: "boolean",
      default: true,
      hint: "Set to false to force real-time-only verification.",
      advanced: true,
    },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Receive job lifecycle events at this URL. See docs/job-callbacks for the payload " +
        "shapes.",
      advanced: true,
    },
  ],
  output: [
    { key: "job_id", type: "number", label: "The created job's id" },
    { key: "execution_time", type: "number", label: "Server-side execution time, in ms" },
  ],

  execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    const body: Record<string, unknown> = {
      input_location: input.inputLocation,
      auto_parse: input.autoParse ?? false,
      auto_start: input.autoStart ?? false,
      run_sample: input.runSample ?? false,
      allow_manual_review: input.allowManualReview ?? false,
    };
    if (input.filename) body.filename = input.filename;
    if (input.callbackUrl) body.callback_url = input.callbackUrl;
    if (input.leverageHistoricalData !== undefined) {
      body.request_meta_data = { leverage_historical_data: input.leverageHistoricalData };
    }

    if (input.inputLocation === "remote_url") {
      body.input = input.remoteUrl;
    } else {
      const emails = input.emails ?? [];
      body.input = emails.map((email, i) => {
        const row: Record<string, string> = { email };
        if (input.ids?.[i]) row.id = input.ids[i];
        if (input.names?.[i]) row.name = input.names[i];
        return row;
      });
    }

    return client.request("/jobs/create", { method: "POST", body });
  },
};

export default jobsCreate;
