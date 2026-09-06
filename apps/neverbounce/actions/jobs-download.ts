import type { ActionDefinition } from "@w6w/types";
import { NeverBounceClient } from "../lib/client.ts";

interface Input {
  jobId: number;
  valids?: boolean;
  invalids?: boolean;
  catchalls?: boolean;
  unknowns?: boolean;
  disposables?: boolean;
  includeDuplicates?: boolean;
  onlyDuplicates?: boolean;
  onlyBadSyntax?: boolean;
  emailStatus?: boolean;
}

/**
 * `GET /jobs/download` — download a job's results as a CSV file. Source:
 * `docs/jobs-download`, which the OAS marks `validation.status: "invalid"`
 * ("Unable to locate the API definition for this file") because it isn't a
 * JSON endpoint at all — per the docs, "This endpoint returns an
 * `application/octet-stream` containing the job data as a CSV file. Because
 * of this, the API explorer is not available." See `lib/client.ts`'s
 * `downloadCsv`, which reads the response as text instead of JSON.
 *
 * Only the documented Segmentation flags plus the `email_status` Append are
 * modeled as params — the vendor documents several more Append/Settings
 * options (`bad_syntax`, `free_email_host`, `role_account`, `addr`, `host`,
 * `binary_operators_type`, and others) that are left out to keep this
 * action's surface reasonable; see the README.
 */
interface JobDownloadOutput {
  csv: string;
}

const jobsDownload: ActionDefinition<Input, JobDownloadOutput> = {
  key: "jobs-download",
  type: "read",
  resource: "job",
  title: "Download Job Results",
  description: "Download a job's verification results as a CSV file.",
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "number",
      required: true,
    },
    { key: "valids", label: "Include Valid", type: "boolean", default: true, advanced: true },
    { key: "invalids", label: "Include Invalid", type: "boolean", default: true, advanced: true },
    {
      key: "catchalls",
      label: "Include Catch-All",
      type: "boolean",
      default: true,
      advanced: true,
    },
    { key: "unknowns", label: "Include Unknown", type: "boolean", default: true, advanced: true },
    {
      key: "disposables",
      label: "Include Disposable",
      type: "boolean",
      default: true,
      advanced: true,
    },
    {
      key: "includeDuplicates",
      label: "Include Duplicates",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "onlyDuplicates",
      label: "Only Duplicates",
      type: "boolean",
      default: false,
      hint: "Overrides every other segmentation option — download only duplicated rows.",
      advanced: true,
    },
    {
      key: "onlyBadSyntax",
      label: "Only Bad Syntax",
      type: "boolean",
      default: false,
      hint: "Overrides every other segmentation option — download only bad-syntax rows.",
      advanced: true,
    },
    {
      key: "emailStatus",
      label: "Append Result Column",
      type: "boolean",
      default: true,
      hint: "Append a column with the verification result (valid, invalid, disposable, catchall, " +
        "unknown).",
      advanced: true,
    },
  ],
  output: [{ key: "csv", type: "string", label: "The raw CSV response body" }],

  async execute(input, ctx) {
    const client = new NeverBounceClient(ctx);
    const csv = await client.downloadCsv({
      job_id: input.jobId,
      valids: input.valids === false ? 0 : 1,
      invalids: input.invalids === false ? 0 : 1,
      catchalls: input.catchalls === false ? 0 : 1,
      unknowns: input.unknowns === false ? 0 : 1,
      disposables: input.disposables === false ? 0 : 1,
      include_duplicates: input.includeDuplicates ? 1 : 0,
      only_duplicates: input.onlyDuplicates ? 1 : undefined,
      only_bad_syntax: input.onlyBadSyntax ? 1 : undefined,
      email_status: input.emailStatus === false ? 0 : 1,
    });
    return { csv };
  },
};

export default jobsDownload;
