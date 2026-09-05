import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  folderId: string;
  continuation?: string;
  limit?: number;
  itemTypes?: Array<"design" | "folder" | "image" | "brand_template">;
  sortBy?:
    | "created_ascending"
    | "created_descending"
    | "modified_ascending"
    | "modified_descending"
    | "title_ascending"
    | "title_descending";
  pinStatus?: "any" | "pinned";
}

/**
 * `GET /v1/folders/{folderId}/items` — requires `folder:read`.
 *
 * `brand_template` items are omitted from the default `item_types` set — you
 * must opt in explicitly, and even then they're only returned for users on a
 * plan with brand-template access (Pro/Teams/Enterprise). Video assets are
 * never returned by this endpoint (Canva-documented limitation).
 */
const listFolderItems: ActionDefinition<Input> = {
  key: "list-folder-items",
  type: "read",
  resource: "folder",
  title: "List Folder Items",
  description: "List the contents of a folder — subfolders, designs, image assets, and " +
    "(if requested) brand templates.",
  params: [
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      required: true,
      hint: "Use 'root' for the top level of the user's projects, or 'uploads' for their " +
        "Uploads folder.",
    },
    { key: "continuation", label: "Continuation token", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
    },
    {
      key: "itemTypes",
      label: "Item types",
      type: "multiselect",
      hint: "Defaults to design, folder and image. brand_template must be selected explicitly.",
      options: [
        { value: "design", label: "Designs" },
        { value: "folder", label: "Folders" },
        { value: "image", label: "Image assets" },
        { value: "brand_template", label: "Brand templates" },
      ],
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "modified_descending",
      options: [
        { value: "created_ascending", label: "Created (oldest first)" },
        { value: "created_descending", label: "Created (newest first)" },
        { value: "modified_ascending", label: "Modified (oldest first)" },
        { value: "modified_descending", label: "Modified (newest first)" },
        { value: "title_ascending", label: "Title (A-Z)" },
        { value: "title_descending", label: "Title (Z-A)" },
      ],
    },
    {
      key: "pinStatus",
      label: "Pin status",
      type: "select",
      default: "any",
      options: [
        { value: "any", label: "Any" },
        { value: "pinned", label: "Pinned only" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Folder items" },
    { key: "continuation", type: "string", label: "Continuation token" },
  ],

  execute(input, ctx) {
    const client = new CanvaClient(ctx);
    return client.request(`/rest/v1/folders/${encodeURIComponent(input.folderId)}/items`, {
      query: {
        continuation: input.continuation,
        limit: input.limit,
        item_types: input.itemTypes?.length ? input.itemTypes.join(",") : undefined,
        sort_by: input.sortBy,
        pin_status: input.pinStatus,
      },
    });
  },
};

export default listFolderItems;
