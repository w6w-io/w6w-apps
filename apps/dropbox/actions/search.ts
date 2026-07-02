import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  query: string;
  path?: string;
  fileStatus?: "active" | "deleted";
  filenameOnly?: boolean;
  fileExtensions?: string;
  fileCategories?: string;
  maxResults?: number;
  cursor?: string;
}

/**
 * Search files in Dropbox. Walks one page; when the response's `has_more` is
 * true, pass the returned `cursor` back through this action's `cursor` input
 * to fetch the next page (Dropbox switches to `/files/search/continue_v2`
 * automatically).
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Search for files and folders by name.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Search string. Dropbox matches file names, and (when filename_only=false) file contents.",
    },
    {
      key: "path",
      label: "Folder",
      type: "string",
      hint: "Restrict search to a folder. Leave empty to search everywhere.",
    },
    {
      key: "fileStatus",
      label: "File status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "deleted", label: "Deleted" },
      ],
      default: "active",
    },
    { key: "filenameOnly", label: "Filename only", type: "boolean", default: true },
    {
      key: "fileExtensions",
      label: "File extensions",
      type: "string",
      hint: "Comma-separated, e.g. `jpg,pdf`. Case-insensitive.",
    },
    {
      key: "fileCategories",
      label: "File categories",
      type: "string",
      hint:
        "Comma-separated. Valid: image, document, pdf, spreadsheet, presentation, audio, video, folder, paper, others.",
    },
    { key: "maxResults", label: "Max results", type: "number", default: 100 },
    { key: "cursor", label: "Continuation cursor", type: "string" },
  ],
  output: [
    { key: "matches", type: "array", label: "Matches" },
    { key: "cursor", type: "string", label: "Cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    if (input.cursor) {
      return client.request("/files/search/continue_v2", {
        body: { cursor: input.cursor },
      });
    }

    const options: Record<string, unknown> = {
      filename_only: input.filenameOnly ?? true,
      max_results: input.maxResults ?? 100,
      file_status: input.fileStatus ?? "active",
    };
    if (input.path) options.path = input.path;
    if (input.fileExtensions) {
      options.file_extensions = input.fileExtensions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (input.fileCategories) {
      options.file_categories = input.fileCategories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return client.request("/files/search_v2", {
      body: {
        query: input.query,
        options,
      },
    });
  },
};

export default search;
