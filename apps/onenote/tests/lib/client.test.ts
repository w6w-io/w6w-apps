import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  containerBase,
  GraphClient,
  notebookPath,
  notebooksPath,
  onenoteBase,
  pagePath,
  pagesPath,
  sectionGroupPath,
  sectionPath,
} from "../../lib/client.ts";

// ---------------------------------------------------------------- addressing --

Deno.test("onenoteBase: defaults to /me/onenote", () => {
  assertEquals(onenoteBase(), "/me/onenote");
  assertEquals(onenoteBase({}), "/me/onenote");
});

Deno.test("onenoteBase: user / group / site each need a Location ID", () => {
  assertEquals(onenoteBase({ location: "user", locationId: "u1" }), "/users/u1/onenote");
  assertEquals(onenoteBase({ location: "group", locationId: "g1" }), "/groups/g1/onenote");
  assertEquals(onenoteBase({ location: "site", locationId: "s1" }), "/sites/s1/onenote");
});

Deno.test("onenoteBase: a non-me location with no Location ID throws", () => {
  assertThrows(() => onenoteBase({ location: "user" }), Error, "Location ID");
  assertThrows(() => onenoteBase({ location: "group" }), Error, "Location ID");
  assertThrows(() => onenoteBase({ location: "site" }), Error, "Location ID");
});

Deno.test("notebooksPath / notebookPath", () => {
  assertEquals(notebooksPath(), "/me/onenote/notebooks");
  assertEquals(notebookPath({}, "n1"), "/me/onenote/notebooks/n1");
  assertEquals(notebookPath({}, "n1", "/sections"), "/me/onenote/notebooks/n1/sections");
});

Deno.test("notebookPath: empty id throws", () => {
  assertThrows(() => notebookPath({}, ""), Error, "Notebook ID");
});

Deno.test("containerBase: flat when neither container id is given", () => {
  assertEquals(containerBase({}, "sections"), "/me/onenote/sections");
  assertEquals(containerBase({}, "sectionGroups"), "/me/onenote/sectionGroups");
});

Deno.test("containerBase: under a notebook or a section group", () => {
  assertEquals(
    containerBase({ notebookId: "n1" }, "sections"),
    "/me/onenote/notebooks/n1/sections",
  );
  assertEquals(
    containerBase({ sectionGroupId: "sg1" }, "sectionGroups"),
    "/me/onenote/sectionGroups/sg1/sectionGroups",
  );
});

Deno.test("containerBase: both container ids at once is rejected", () => {
  assertThrows(
    () => containerBase({ notebookId: "n1", sectionGroupId: "sg1" }, "sections"),
    Error,
    "not both",
  );
});

Deno.test("sectionPath / sectionGroupPath require an id", () => {
  assertEquals(sectionPath({}, "sec1"), "/me/onenote/sections/sec1");
  assertEquals(sectionGroupPath({}, "sg1"), "/me/onenote/sectionGroups/sg1");
  assertThrows(() => sectionPath({}, ""), Error, "Section ID");
  assertThrows(() => sectionGroupPath({}, ""), Error, "Section group ID");
});

Deno.test("pagesPath: flat by default, scoped to a section otherwise", () => {
  assertEquals(pagesPath(), "/me/onenote/pages");
  assertEquals(pagesPath({ sectionId: "sec1" }), "/me/onenote/sections/sec1/pages");
});

Deno.test("pagePath requires an id and accepts a suffix", () => {
  assertEquals(pagePath({}, "p1"), "/me/onenote/pages/p1");
  assertEquals(pagePath({}, "p1", "/content"), "/me/onenote/pages/p1/content");
  assertThrows(() => pagePath({}, ""), Error, "Page ID");
});

// -------------------------------------------------------------------- client --

Deno.test("GraphClient.request: 204 decodes to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new GraphClient(ctx);
  const out = await client.request("/me/onenote/pages/p1/content");
  assertEquals(out, undefined);
});

Deno.test("GraphClient: a failed request surfaces the vendor's error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "20166", message: "The request is not properly authenticated." } },
  }]);
  const client = new GraphClient(ctx);
  await assertRejects(() => client.request("/me/onenote/notebooks"), Error, "20166");
});

Deno.test("GraphClient.html: returns raw text, never parses JSON", async () => {
  const { ctx } = mockCtx([{ body: "<html><body>hi</body></html>" }]);
  const client = new GraphClient(ctx);
  const out = await client.html("/me/onenote/pages/p1/content");
  assertEquals(out, "<html><body>hi</body></html>");
});

Deno.test("GraphClient.postHtml: sends the string body verbatim with the given content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  const client = new GraphClient(ctx);
  const out = await client.postHtml<{ id: string }>(
    "/me/onenote/pages",
    "<html></html>",
    "text/html",
  );
  assertEquals(calls[0].body, "<html></html>");
  assertEquals(calls[0].headers["content-type"], "text/html");
  assertEquals(out.id, "p1");
});

Deno.test("GraphClient.status: reports the HTTP status without decoding a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new GraphClient(ctx);
  const out = await client.status("/me/onenote/pages/p1", { method: "DELETE" });
  assertEquals(out.status, 204);
});

Deno.test("GraphClient.page vs collect: collect walks nextLink, page does not", async () => {
  const { ctx: ctxSingle } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/x?p=2" } },
  ]);
  const single = await new GraphClient(ctxSingle).page("/me/onenote/pages");
  assertEquals(single.pages, 1);
  assertEquals(single.nextLink, "https://graph.microsoft.com/v1.0/x?p=2");

  const { ctx: ctxAll, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/x?p=2" } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const all = await new GraphClient(ctxAll).collect("/me/onenote/pages");
  assertEquals(calls.length, 2);
  assertEquals(all.value.length, 2);
  assertEquals(all.nextLink, undefined);
});

Deno.test("GraphClient.collect: stops at maxPages and returns the surviving nextLink", async () => {
  const { ctx } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/x?p=2" } },
    { body: { value: [{ id: "b" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/x?p=3" } },
  ]);
  const out = await new GraphClient(ctx).collect("/me/onenote/pages", {}, 2);
  assertEquals(out.pages, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.nextLink, "https://graph.microsoft.com/v1.0/x?p=3");
});
