import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/files/upload` — queue a localization file for
 * import.
 *
 * ## This is async, not a synchronous "upload and see the result"
 *
 * The response is a `202` (or, per the vendor, a currently-unused `302`) with
 * a `process` object (`process_id`, `status`) — not the imported keys. The
 * import runs in the background; poll `process-get` with the returned
 * `process_id` until `status` is `finished` or `failed`.
 *
 * ## `data` is the whole file, base64-encoded
 *
 * `ctx.fetch`'s body is JSON, so the file bytes travel as a base64 string in
 * the `data` field alongside `filename` and `lang_iso` — there is no
 * multipart/form-data variant of this endpoint.
 *
 * Only the most commonly needed import options are named params; the rest
 * (there are over two dozen, covering tagging, translation-memory application,
 * custom-status assignment and more) are reachable through `extraOptions`,
 * merged over the named fields.
 */
interface Input {
  projectId: string;
  filename: string;
  data: string;
  langIso: string;
  convertPlaceholders?: boolean;
  detectIcuPlurals?: boolean;
  replaceModified?: boolean;
  distinguishByFile?: boolean;
  cleanupMode?: boolean;
  extraOptions?: unknown;
}

const fileUpload: ActionDefinition<Input> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Queue a localization file (JSON, strings, XML, ...) for import.",
  idempotent: false,
  params: [
    projectIdParam,
    {
      key: "filename",
      label: "Filename",
      type: "string",
      required: true,
      hint: "May include a relative path, e.g. `admin/main.json`.",
    },
    {
      key: "data",
      label: "File content (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file bytes.",
    },
    {
      key: "langIso",
      label: "Language ISO code",
      type: "string",
      required: true,
      hint: "Language of the translations in this file.",
    },
    { key: "convertPlaceholders", label: "Convert placeholders", type: "boolean" },
    { key: "detectIcuPlurals", label: "Detect ICU plurals", type: "boolean" },
    { key: "replaceModified", label: "Replace modified translations", type: "boolean" },
    {
      key: "distinguishByFile",
      label: "Distinguish keys by file",
      type: "boolean",
      hint: "Allow keys with the same name to coexist across different filenames.",
    },
    {
      key: "cleanupMode",
      label: "Cleanup mode",
      type: "boolean",
      hint: "Delete every key (in every language) that this file does not contain. Destructive.",
    },
    {
      key: "extraOptions",
      label: "Extra options",
      type: "json",
      advanced: true,
      hint: "Any other Upload a file body field (tags, tag_inserted_keys, apply_tm, " +
        "custom_translation_status_ids, ...), merged over the named fields above.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "process", type: "object", label: "Queued process — poll with Get Process" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/files/upload`, {
      method: "POST",
      body: {
        ...compact({
          convert_placeholders: input.convertPlaceholders,
          detect_icu_plurals: input.detectIcuPlurals,
          replace_modified: input.replaceModified,
          distinguish_by_file: input.distinguishByFile,
          cleanup_mode: input.cleanupMode,
        }),
        ...(asOptionalJson<Record<string, unknown>>(input.extraOptions, "Extra options") ?? {}),
        // Required fields last, so nothing in extraOptions can silently override them.
        filename: input.filename,
        data: input.data,
        lang_iso: input.langIso,
      },
    });
  },
};

export default fileUpload;
