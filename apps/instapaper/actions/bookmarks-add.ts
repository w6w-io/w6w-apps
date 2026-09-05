import type { ActionDefinition } from "@w6w/types";
import { type InstapaperBookmark, InstapaperClient } from "../lib/client.ts";

/**
 * `POST /api/1/bookmarks/add` — save a URL as an unread bookmark.
 *
 * Not marked idempotent: the docs state that adding a URL the account already
 * saved moves the existing bookmark to the top of its folder and overwrites
 * its title/description/content rather than creating a duplicate — a repeat
 * call still changes visible state (position), so it is not safe to retry
 * blindly.
 *
 * `tags` is exposed as a plain list of names; the wire format the docs
 * document, `[{"name": "Tag Name"}, ...]`, is built here.
 *
 * Two documented special-case params are surfaced but left for the caller to
 * use deliberately, per the docs' own warnings:
 *   - `content` — full page HTML, required for domains error 1220 names.
 *   - `isPrivateFromSource` — makes this a private, URL-less bookmark; `url`
 *     is then ignored and `content` becomes required.
 */
interface Input {
  url?: string;
  title?: string;
  description?: string;
  folderId?: number;
  resolveFinalUrl?: boolean;
  archived?: boolean;
  tags?: string[];
  content?: string;
  isPrivateFromSource?: string;
}

const bookmarksAdd: ActionDefinition<Input> = {
  key: "bookmarks-add",
  type: "perform",
  resource: "bookmark",
  title: "Add Bookmark",
  description: "Save a URL to the user's Instapaper account.",
  idempotent: false,
  params: [
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Required unless Private Source is set below.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "If omitted, Instapaper looks it up synchronously, which delays the call.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "folderId", label: "Folder ID", type: "number" },
    {
      key: "resolveFinalUrl",
      label: "Resolve redirects first",
      type: "boolean",
      default: true,
      hint: "Default true. Set false only when the URL is already the final one a browser would " +
        "load — resolving redirects delays the call.",
    },
    { key: "archived", label: "Archive immediately", type: "boolean", default: false },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "Created automatically if they don't already exist.",
    },
    {
      key: "content",
      label: "Full page HTML",
      type: "text",
      advanced: true,
      hint: "Only for pages Instapaper can't crawl itself (login-gated, Premium-only). Must be " +
        "UTF-8. Required when Instapaper returns error 1220.",
    },
    {
      key: "isPrivateFromSource",
      label: "Private source label",
      type: "string",
      advanced: true,
      hint: 'Set to mark this a private, URL-less bookmark (e.g. "email"). When set, URL is ' +
        "ignored and Full page HTML becomes required.",
    },
  ],
  output: [
    { key: "bookmark_id", type: "number", label: "Bookmark id" },
    { key: "url", type: "string", label: "URL" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const [bookmark] = await new InstapaperClient(ctx).call<InstapaperBookmark>(
      "/api/1/bookmarks/add",
      {
        url: input.url,
        title: input.title,
        description: input.description,
        folder_id: input.folderId,
        resolve_final_url: input.resolveFinalUrl === false ? 0 : 1,
        archived: input.archived ? 1 : 0,
        tags: input.tags && input.tags.length > 0
          ? JSON.stringify(input.tags.map((name) => ({ name })))
          : undefined,
        content: input.content,
        is_private_from_source: input.isPrivateFromSource,
      },
    );
    if (!bookmark) throw new Error("Instapaper returned no bookmark");
    return bookmark;
  },
};

export default bookmarksAdd;
