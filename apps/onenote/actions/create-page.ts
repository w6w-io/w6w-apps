import type { ActionDefinition } from "@w6w/types";
import { GraphClient, pagesPath } from "../lib/client.ts";
import { locationParams, pageOutput } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  sectionId?: string;
  sectionName?: string;
  content: string;
  contentType?: string;
}

/**
 * `POST .../onenote/sections/{id}/pages` (any section the credential can reach) ·
 * `POST .../onenote/pages[?sectionName=...]` (the DEFAULT notebook only)
 *
 * https://learn.microsoft.com/en-us/graph/api/section-post-pages
 * https://learn.microsoft.com/en-us/graph/api/onenote-post-pages
 *
 * There is no `title` param: a page's title comes from the `<title>` element
 * inside the supplied HTML document, exactly as the reference's own examples
 * show — Graph parses it out, it is not a separate field this App could set
 * independently.
 *
 * Two ways to target a section, and they are NOT interchangeable:
 *
 *   - **Section ID** posts to `.../sections/{id}/pages` and reaches ANY
 *     section the credential can reach, in any notebook.
 *   - Leaving Section ID empty posts to the flat `.../pages`, which the
 *     reference states plainly "is used only to create pages in the current
 *     user's DEFAULT notebook" — a different notebook is unreachable this
 *     way regardless of what Section name says. **Section name** then picks a
 *     section BY NAME inside that default notebook only, and if no section by
 *     that name exists, Graph silently creates one rather than failing.
 *
 * Content is HTML text only — no multipart/binary attachment support. A w6w
 * Action's `ctx.fetch` body is carried to the host as text
 * (`core/packages/runtime/src/sandbox/worker.ts`), so bytes above U+007F do
 * not survive the crossing intact; the same limitation the sibling
 * `sharepoint` App's `upload-file` action documents for the same reason. A
 * `<img src="https://...">` pointing at an already-hosted image still works —
 * only the binary multipart form (embedding image/file bytes directly in the
 * request) is out of scope.
 *
 * Least privileged delegated permission: `Notes.Create`. Returns `201
 * Created` and the new `page` object. Supported for both work-or-school and
 * personal Microsoft accounts.
 */
const createPage: ActionDefinition<Input> = {
  key: "create-page",
  type: "perform",
  resource: "page",
  title: "Create Page",
  description: "Create a new OneNote page from an HTML document.",
  // Every call mints a new page with a new id; Graph offers no dedupe key, so
  // a retry after a timeout can create a duplicate page.
  idempotent: false,
  params: [
    ...locationParams(),
    {
      key: "sectionId",
      label: "Section ID",
      type: "string",
      hint:
        "Create in this section, in any notebook the credential can reach. Leave empty to create in the default notebook instead (see Section name).",
    },
    {
      key: "sectionName",
      label: "Section name",
      type: "string",
      advanced: true,
      hint:
        "Only used when Section ID is empty: creates in this section BY NAME inside the current user's default notebook. If no section by that name exists, Graph creates one rather than failing.",
    },
    {
      key: "content",
      label: "HTML content",
      type: "text",
      required: true,
      placeholder:
        "<!DOCTYPE html><html><head><title>My page</title></head><body><p>Hello</p></body></html>",
      hint:
        "A full HTML document. The page's title is parsed from the `<title>` element — there is no separate Title field.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "text/html",
      advanced: true,
      hint:
        "The `Content-Type` header. The reference accepts `text/html` or `application/xhtml+xml`.",
    },
  ],
  output: pageOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const target = pagesPath(input);
    ctx.log("info", "creating OneNote page", { path: target, bytes: input.content?.length ?? 0 });
    return await client.postHtml(
      target,
      input.content ?? "",
      input.contentType || "text/html",
      { query: input.sectionId ? {} : { sectionName: input.sectionName } },
    );
  },
};

export default createPage;
