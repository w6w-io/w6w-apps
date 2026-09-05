import type { ActionDefinition } from "@w6w/types";
import { GraphClient, pagePath } from "../lib/client.ts";
import { locationParams, pageIdParam } from "../lib/params.ts";

interface PatchContentCommand {
  target: string;
  action: "insert" | "append" | "prepend" | "replace";
  position?: "before" | "after";
  content?: string;
}

interface Input {
  location?: string;
  locationId?: string;
  pageId: string;
  commands: PatchContentCommand[];
}

interface Output {
  status: number;
}

/**
 * `PATCH /me/onenote/pages/{id}/content` (and the `users`/`groups`/`sites` equivalents)
 *
 * https://learn.microsoft.com/en-us/graph/api/page-update
 * https://learn.microsoft.com/en-us/graph/onenote-update-page
 *
 * The request body is a JSON array of `patchContentCommand` objects, each
 * naming a `target` (`body`, `title`, a `#data-id` from HTML fetched with
 * `?includeIDs=true`, or a Graph-generated `id` without the `#`), an `action`
 * (`insert` / `append` / `prepend` / `replace`), an optional `position`
 * (`before` | `after`, default `after`), and the `content` HTML fragment —
 * see Get Page Content for producing addressable `#data-id` targets first.
 *
 * A quirk worth knowing before you build one of these: **a `www` image link
 * that worked in Create Page does NOT work here.** The guide states plainly
 * "When updating an image on a OneNote page, you can't use www links. The
 * service won't try to download random resources" — an update's `<img>`
 * content must be a data URL or a multipart part-name, neither of which this
 * App's HTML-only body can carry (see the note on binary content in
 * `actions/create-page.ts`), so image-adding updates are out of scope here
 * even though image-adding CREATES are not.
 *
 * Not marked `idempotent`: `append`/`prepend` add content again on a retry
 * rather than converging on an end state, and a caller may legitimately mix
 * those with a converging `replace` in the same batch, so no single answer is
 * honest for every possible command list.
 *
 * Least privileged delegated permission: `Notes.ReadWrite` — this endpoint's
 * table lists no `Notes.Create` alternative at all, unlike every read/create
 * endpoint in this App (see `auth/oauth2.ts`). Returns `204 No Content`.
 * Supported for both work-or-school and personal Microsoft accounts.
 */
const updatePageContent: ActionDefinition<Input, Output> = {
  key: "update-page-content",
  type: "perform",
  resource: "page",
  title: "Update Page Content",
  description: "Apply a batch of insert/append/prepend/replace commands to a page's HTML.",
  idempotent: false,
  params: [
    ...locationParams(),
    pageIdParam,
    {
      key: "commands",
      label: "Commands",
      type: "json",
      required: true,
      hint:
        'Array of `{ target, action, position?, content? }` objects. `target`: "body", "title", a `#data-id` (from Get Page Content with Include element IDs on), or a Graph-generated `id` (no `#`). `action`: insert | append | prepend | replace. `position`: before | after (default after).',
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx): Promise<Output> {
    const client = new GraphClient(ctx);
    const commands = Array.isArray(input.commands) ? input.commands : [];
    if (commands.length === 0) throw new Error("Commands must be a non-empty array.");
    ctx.log("info", "updating OneNote page content", {
      pageId: input.pageId,
      commands: commands.length,
    });
    return await client.status(pagePath(input, input.pageId, "/content"), {
      method: "PATCH",
      body: commands,
    });
  },
};

export default updatePageContent;
