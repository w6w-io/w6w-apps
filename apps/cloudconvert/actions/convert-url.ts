import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CloudConvertClient, SYNC_API_BASE } from "../lib/client.ts";

/**
 * Convert a file reachable by URL and get back a download URL, in one call.
 *
 * This builds and runs the exact three-task graph CloudConvert's own "Convert Files" doc
 * uses as its worked example — `import/url` -> `convert` -> `export/url` — against the
 * **synchronous** host, so the whole thing is one request/response instead of
 * create-then-poll. It is the convenience wrapper this app's README calls its centre of
 * gravity; `job-create`/`job-create-and-wait` expose the full task graph (S3/Azure/GCS/
 * OpenStack/SFTP import and export, multi-task jobs, non-convert operations) for
 * anything this one-shot shape does not cover.
 *
 * ## Scoped to URL import/export on purpose
 *
 * CloudConvert's `import/upload` operation is a two-step flow: create a job, then
 * `POST multipart/form-data` the file's actual bytes to a one-time signed URL the job
 * response hands back. This app's sandbox coerces every `ctx.fetch` body to a string en
 * route to the network — the same constraint documented in this pack's `box` and
 * `documenso` apps — so a binary file's bytes would not survive that trip intact. Rather
 * than ship an upload action that corrupts non-text files, this app covers only the
 * import/export operations that need no file bytes to pass through its own sandbox at
 * all: `import/url` and `export/url`, plus (via `job-create`) the S3/Azure/GCS/
 * OpenStack/SFTP and base64/raw-string forms, which are all just JSON parameters that
 * CloudConvert's own workers act on directly.
 *
 * ## Failure surfaces the failing task's own message
 *
 * A synchronous job can come back with `status: "error"` — a normal response, not an
 * HTTP failure — when the conversion itself failed (e.g. a corrupt input file).
 * CloudConvert's own guidance is "please do not automatically retry tasks", so this
 * throws with the failed task's `message`/`code` rather than returning a value that
 * looks like a success, and `idempotent: false` reflects that a retry is a judgement
 * call, not something the runtime should do on its own.
 */
interface Task {
  id?: string;
  name?: string;
  operation?: string;
  status?: string;
  message?: string;
  code?: string;
  result?: { files?: Array<{ filename?: string; url?: string }> };
}

interface JobResponse {
  id?: string;
  status?: string;
  tasks?: Task[];
}

interface Input {
  url: string;
  filename?: string;
  headers?: unknown;
  outputFormat: string;
  inputFormat?: string;
  engine?: string;
  engineVersion?: string;
  options?: unknown;
  inline?: boolean;
  archiveMultipleFiles?: boolean;
  tag?: string;
}

interface Output {
  jobId?: string;
  status?: string;
  files: Array<{ filename?: string; url?: string }>;
}

const convertUrl: ActionDefinition<Input, Output> = {
  key: "convert-url",
  type: "perform",
  resource: "convert",
  title: "Convert File (from URL)",
  description: "Download a file from a URL, convert it, and get back a download URL — in one " +
    "blocking call. For anything else (cloud-storage import/export, multi-file jobs, " +
    "non-convert operations), use Create Job.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "Source file URL",
      type: "string",
      required: true,
      hint: "Downloaded via CloudConvert's import/url task.",
    },
    {
      key: "outputFormat",
      label: "Output format",
      type: "string",
      required: true,
      placeholder: "pdf",
      hint: "The target format extension, e.g. pdf, png, mp3. See GET /v2/operations (the " +
        "operation-list action) for the full catalog of supported conversions.",
    },
    {
      key: "inputFormat",
      label: "Input format",
      type: "string",
      hint: "The current format, e.g. docx. If left empty, CloudConvert uses the source " +
        "file's extension.",
    },
    {
      key: "filename",
      label: "Source filename",
      type: "string",
      advanced: true,
      hint: "Filename (with extension) for the downloaded input file. If left empty, " +
        "CloudConvert tries to detect it from the URL.",
    },
    {
      key: "headers",
      label: "Download headers",
      type: "json",
      advanced: true,
      hint: "Extra headers to send with the download request — used to reach a URL that " +
        "requires its own authorization.",
    },
    {
      key: "engine",
      label: "Engine",
      type: "string",
      advanced: true,
      hint: "Use a specific conversion engine, when more than one supports this format pair.",
    },
    {
      key: "engineVersion",
      label: "Engine version",
      type: "string",
      advanced: true,
    },
    {
      key: "options",
      label: "Additional convert options",
      type: "json",
      advanced: true,
      hint: "Merged into the convert task's own parameters — format-specific options such as " +
        "pages, quality or optimize_print. CloudConvert's convert-task parameters vary by " +
        "input_format/output_format; see cloudconvert.com/docs/operations/convert-files.",
    },
    {
      key: "inline",
      label: "Inline (don't force download)",
      type: "boolean",
      advanced: true,
      hint: "Sets the Content-Disposition: inline header on the export URL, so a browser " +
        "displays the file instead of downloading it.",
    },
    {
      key: "archiveMultipleFiles",
      label: "Zip multiple output files",
      type: "boolean",
      advanced: true,
      hint: "If the conversion produces more than one file, export a single ZIP instead of " +
        "one URL per file.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      advanced: true,
      hint: "An arbitrary string to identify the job.",
    },
  ],
  output: [
    { key: "jobId", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status (finished or error)" },
    { key: "files", type: "array", label: "Output files (filename, url)" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "converting file from URL", { outputFormat: input.outputFormat });

    const importOptions = asOptionalJson<Record<string, unknown>>(
      input.headers,
      "Download headers",
    );
    const convertOptions = asOptionalJson<Record<string, unknown>>(
      input.options,
      "Additional convert options",
    );

    const job = await new CloudConvertClient(ctx).data<JobResponse>(`/jobs`, {
      base: SYNC_API_BASE,
      method: "POST",
      body: {
        tag: input.tag,
        tasks: {
          "import-1": {
            operation: "import/url",
            url: input.url,
            filename: input.filename,
            headers: importOptions,
          },
          "convert-1": {
            ...convertOptions,
            operation: "convert",
            input: "import-1",
            input_format: input.inputFormat,
            output_format: input.outputFormat,
            engine: input.engine,
            engine_version: input.engineVersion,
          },
          "export-1": {
            operation: "export/url",
            input: "convert-1",
            inline: input.inline,
            archive_multiple_files: input.archiveMultipleFiles,
          },
        },
      },
    });

    const tasks = job.tasks ?? [];
    if (job.status === "error") {
      const failed = tasks.find((t) => t.status === "error");
      throw new Error(
        failed
          ? `CloudConvert job ${job.id} failed at task "${failed.name ?? failed.id}" ` +
            `(${failed.operation})${failed.code ? ` [${failed.code}]` : ""}: ${
              failed.message ?? "no message"
            }`
          : `CloudConvert job ${job.id} failed`,
      );
    }

    const exportTask = tasks.find((t) => t.operation === "export/url") ??
      tasks.find((t) => t.name === "export-1");
    return {
      jobId: job.id,
      status: job.status,
      files: exportTask?.result?.files ?? [],
    };
  },
};

export default convertUrl;
