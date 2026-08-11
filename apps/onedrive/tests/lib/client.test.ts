import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  childPath,
  compact,
  drivePath,
  encodeItemPath,
  GraphClient,
  itemPath,
  odataList,
  odataString,
  requireItemPath,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

// -------------------------------------------------------------- addressing --

Deno.test("drivePath: empty means the signed-in user's own drive", () => {
  assertEquals(drivePath(), "/me/drive");
  assertEquals(drivePath(""), "/me/drive");
  assertEquals(drivePath("  "), "/me/drive");
});

Deno.test("drivePath: a drive id addresses the top-level drives collection", () => {
  assertEquals(drivePath("b!abc"), "/drives/b!abc");
});

Deno.test("encodeItemPath: encodes each segment but keeps the separators", () => {
  assertEquals(encodeItemPath("Reports/Q3 plan.pdf"), "Reports/Q3%20plan.pdf");
  assertEquals(encodeItemPath("/Reports//Q3/"), "Reports/Q3");
  assertEquals(encodeItemPath("a+b/c&d"), "a%2Bb/c%26d");
});

Deno.test("itemPath: id form", () => {
  assertEquals(itemPath({ itemId: "01ABC" }, "/children"), "/me/drive/items/01ABC/children");
});

Deno.test("itemPath: path form brackets the path with the structural colons", () => {
  assertEquals(
    itemPath({ itemPath: "Reports/Q3.pdf" }, "/content"),
    "/me/drive/root:/Reports/Q3.pdf:/content",
  );
});

Deno.test("itemPath: path form drops the trailing colon when nothing follows", () => {
  // `GET /me/drive/root:/{item-path}` is the documented bare form; a dangling
  // `:` is rejected by Graph.
  assertEquals(itemPath({ itemPath: "Reports/Q3.pdf" }), "/me/drive/root:/Reports/Q3.pdf");
});

Deno.test("itemPath: neither id nor path means the drive root", () => {
  assertEquals(itemPath({}), "/me/drive/root");
  assertEquals(itemPath({}, "/children"), "/me/drive/root/children");
  assertEquals(itemPath({ driveId: "d1" }, "/delta"), "/drives/d1/root/delta");
});

Deno.test("itemPath: id and path together is a caller error, not a silent preference", () => {
  assertThrows(
    () => itemPath({ itemId: "x", itemPath: "y" }),
    Error,
    "not both",
  );
});

Deno.test("itemPath: a path that trims to nothing is rejected", () => {
  assertThrows(() => itemPath({ itemPath: "///" }), Error, "empty");
});

Deno.test("requireItemPath: refuses to fall back to the whole drive", () => {
  assertThrows(() => requireItemPath({}, "/copy"), Error, "must be addressed");
  assertEquals(requireItemPath({ itemId: "i" }, "/copy"), "/me/drive/items/i/copy");
});

Deno.test("childPath: the three documented new-file forms", () => {
  assertEquals(
    childPath({ itemId: "P1" }, "notes.txt", "/content"),
    "/me/drive/items/P1:/notes.txt:/content",
  );
  assertEquals(
    childPath({ itemPath: "FolderA" }, "FileB.txt", "/content"),
    "/me/drive/root:/FolderA/FileB.txt:/content",
  );
  assertEquals(
    childPath({}, "FileB.txt", "/content"),
    "/me/drive/root:/FileB.txt:/content",
  );
});

Deno.test("childPath: a `/` in the file name is refused rather than encoded", () => {
  // Encoding it would silently create the file somewhere else.
  assertThrows(() => childPath({}, "a/b.txt"), Error, "must not contain");
  assertThrows(() => childPath({}, "  "), Error, "empty");
});

// ------------------------------------------------------------------ odata --

Deno.test("odataString: doubles an apostrophe, per OData", () => {
  assertEquals(odataString("Bob's plan"), "Bob''s plan");
});

Deno.test("odataList: joins and drops blanks; empty becomes undefined", () => {
  assertEquals(odataList(["id", " name ", ""]), "id,name");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(undefined), undefined);
});

Deno.test("compact: drops undefined so a PATCH only touches what was set", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null }), { a: 1, c: null });
});

// ----------------------------------------------------------------- client --

Deno.test("client: builds an absolute Graph URL and skips empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GraphClient(ctx).request("/me/drive", {
    query: { $select: "id", $top: undefined, $orderby: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://graph.microsoft.com/v1.0/me/drive");
  assertEquals(url.searchParams.get("$select"), "id");
  assertEquals(url.searchParams.has("$top"), false);
  assertEquals(url.searchParams.has("$orderby"), false);
});

Deno.test("client: an absolute path is used verbatim — that is how nextLink is replayed", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GraphClient(ctx).request(link);
  assertEquals(calls[0].url, link);
});

Deno.test("client: a JSON body sets content-type and is serialized", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GraphClient(ctx).request("/me/drive/root/children", {
    method: "POST",
    body: { name: "x" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("client: surfaces Graph's error.code and message on failure", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { error: { code: "itemNotFound", message: "The resource could not be found." } },
  }]);
  try {
    await new GraphClient(ctx).request("/me/drive/items/nope");
    throw new Error("should have thrown");
  } catch (e) {
    const message = (e as Error).message;
    assert(message.includes("404"), message);
    assert(message.includes("itemNotFound"), message);
    assert(message.includes("The resource could not be found."), message);
  }
});

Deno.test("client: a non-JSON error body is still reported", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  try {
    await new GraphClient(ctx).request("/me/drive");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("bad gateway"), (e as Error).message);
  }
});

Deno.test("client: 204 returns undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new GraphClient(ctx).request("/me/drive/items/x"), undefined);
});

Deno.test("client.status: reports the accepted status code", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new GraphClient(ctx).status("/x", { method: "DELETE" }), { status: 204 });
});

Deno.test("client.accepted: hands back the 202 Location header without following it", async () => {
  const monitor = "https://contoso.sharepoint.com/_api/v2.0/monitor/4A3407B5";
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: undefined,
    headers: { location: monitor },
  }]);
  const out = await new GraphClient(ctx).accepted("/x/copy", { method: "POST" });
  assertEquals(out, { status: 202, monitorUrl: monitor });
  // Exactly one request: the tenant SharePoint host is never called.
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).hostname, "graph.microsoft.com");
});

Deno.test("client.text: sends the raw string under the caller's content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new GraphClient(ctx).text("/me/drive/root:/a.csv:/content", "a,b\n1,2", "text/csv");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "text/csv");
  assertEquals(calls[0].body, "a,b\n1,2");
});

Deno.test("client.text: a failure carries Graph's error detail", async () => {
  const { ctx } = mockCtx([{
    status: 413,
    body: { error: { code: "resourceSizeLimitExceeded", message: "too big" } },
  }]);
  try {
    await new GraphClient(ctx).text("/x/content", "…");
    throw new Error("should have thrown");
  } catch (e) {
    assert((e as Error).message.includes("resourceSizeLimitExceeded"), (e as Error).message);
  }
});

Deno.test("client.page: unwraps the OData envelope and both cursors", async () => {
  const next = "https://graph.microsoft.com/v1.0/next";
  const delta = "https://graph.microsoft.com/v1.0/delta";
  const { ctx } = mockCtx([{
    body: { value: [{ id: "a" }], "@odata.nextLink": next, "@odata.deltaLink": delta },
  }]);
  const out = await new GraphClient(ctx).page("/me/drive/root/delta");
  assertEquals(out.value.length, 1);
  assertEquals(out.nextLink, next);
  assertEquals(out.deltaLink, delta);
  assertEquals(out.pages, 1);
});

Deno.test("client.page: a missing `value` becomes an empty array, not a crash", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await new GraphClient(ctx).page("/x")).value, []);
});

Deno.test("client.collect: walks nextLink and keeps the round's delta link", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=1";
  const delta = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }], "@odata.deltaLink": delta } },
  ]);
  const out = await new GraphClient(ctx).collect("/me/drive/root/delta");
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, next);
  assertEquals(out.value.length, 2);
  assertEquals(out.deltaLink, delta);
  assertEquals(out.pages, 2);
});

Deno.test("client.collect: honours the page cap and hands back the surviving cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/next";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
  ]);
  const out = await new GraphClient(ctx).collect("/x", {}, 1);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
});

Deno.test("client: no action request ever carries an Authorization header", async () => {
  // The `sign` hook is the only code handed the credential.
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new GraphClient(ctx);
  await client.request("/me/drive", { method: "POST", body: { a: 1 } });
  await client.text("/x/content", "hi");
  for (const call of calls) {
    assertEquals(call.headers["authorization"], undefined);
  }
});
