import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, LokaliseClient, toList } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/files/download` — export the project's
 * current translations as a downloadable `.zip` bundle.
 *
 * ## Synchronous, unlike file-upload — but the bundle itself is remote
 *
 * This call blocks until the bundle is built and returns `bundle_url`, a
 * link into an Amazon S3 bucket, valid for **one month**. This action does
 * NOT fetch that URL's contents — `s3-*.amazonaws.com` is not in this app's
 * `network.allow`, and hard-coding one region's S3 host would silently break
 * on another. The bundle is meant to be handed to whatever step needs the
 * file next (an HTTP action, a storage app, a human link).
 *
 * ## A hard size ceiling, added after this app's data was gathered
 *
 * Per Lokalise's own file-download-limitations page (fetched 2026-09-01):
 * *"Starting June 1st, 2025, this endpoint will be limited to projects with
 * under 10,000 key-language pairs."* A project past that ceiling gets an
 * error here — there is no larger paid tier for this specific endpoint, per
 * the same page.
 */
interface Input {
  projectId: string;
  format: string;
  originalFilenames?: boolean;
  filterLangs?: string[];
  filterData?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  exportSort?: string;
  extraOptions?: unknown;
}

const fileDownload: ActionDefinition<Input> = {
  key: "file-download",
  type: "read",
  resource: "file",
  title: "Export Project Files",
  description: "Export the project's current translations as a downloadable .zip bundle.",
  params: [
    projectIdParam,
    {
      key: "format",
      label: "Format",
      type: "string",
      required: true,
      placeholder: "json",
      hint:
        "A supported file extension (json, strings, xml, ...), or ios_sdk / android_sdk for an OTA bundle.",
    },
    {
      key: "originalFilenames",
      label: "Use original filenames",
      type: "boolean",
      hint: "Off exports a single file per language instead of the project's per-file structure.",
    },
    {
      key: "filterLangs",
      label: "Languages to include",
      type: "multiselect",
      hint: "Leave empty to export every project language.",
    },
    {
      key: "filterData",
      label: "Narrow to",
      type: "multiselect",
      options: [
        { value: "translated", label: "Translated" },
        { value: "untranslated", label: "Untranslated" },
        { value: "reviewed", label: "Reviewed" },
        { value: "reviewed_only", label: "Reviewed only" },
        { value: "last_reviewed_only", label: "Last reviewed only" },
        { value: "verified", label: "Verified" },
        { value: "nonhidden", label: "Not hidden" },
      ],
    },
    { key: "includeTags", label: "Include tags", type: "multiselect" },
    { key: "excludeTags", label: "Exclude tags", type: "multiselect" },
    {
      key: "exportSort",
      label: "Key sort order",
      type: "select",
      options: [
        { value: "first_added", label: "First added" },
        { value: "last_added", label: "Last added" },
        { value: "last_updated", label: "Last updated" },
        { value: "a_z", label: "A → Z" },
        { value: "z_a", label: "Z → A" },
      ],
    },
    {
      key: "extraOptions",
      label: "Extra options",
      type: "json",
      advanced: true,
      hint: "Any other Download files body field (bundle_structure, directory_prefix, " +
        "all_platforms, filter_filenames, add_newline_eof, ...), merged over the named fields above.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    {
      key: "bundle_url",
      type: "string",
      label: "Signed S3 URL of the .zip bundle (valid ~1 month)",
    },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}/files/download`, {
      method: "POST",
      body: {
        ...compact({
          original_filenames: input.originalFilenames,
          filter_langs: toList(input.filterLangs),
          filter_data: toList(input.filterData),
          include_tags: toList(input.includeTags),
          exclude_tags: toList(input.excludeTags),
          export_sort: input.exportSort,
        }),
        ...(asOptionalJson<Record<string, unknown>>(input.extraOptions, "Extra options") ?? {}),
        format: input.format,
      },
    });
  },
};

export default fileDownload;
