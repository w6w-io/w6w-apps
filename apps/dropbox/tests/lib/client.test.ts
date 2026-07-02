import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { DropboxClient } from "../../lib/client.ts";

Deno.test("client: defaults to POST and prepends API_URL for relative paths", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new DropboxClient(ctx);
  await client.request("/files/get_metadata", { body: { path: "/a.txt" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dropboxapi.com/2/files/get_metadata");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { path: "/a.txt" });
});

Deno.test("client: passes absolute URLs through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new DropboxClient(ctx);
  await client.request("https://content.dropboxapi.com/2/files/upload", {
    dropboxApiArg: { path: "/x" },
    rawBody: new Uint8Array([1, 2, 3]),
  });
  assertEquals(calls[0].url, "https://content.dropboxapi.com/2/files/upload");
  assertEquals(calls[0].headers["content-type"], "application/octet-stream");
  assertEquals(calls[0].headers["dropbox-api-arg"], JSON.stringify({ path: "/x" }));
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 409, statusText: "Conflict", body: '{"error":"path/conflict"}' },
  ]);
  const client = new DropboxClient(ctx);
  await assertRejects(
    () => client.request("/files/create_folder_v2", { body: { path: "/x" } }),
    Error,
    "Dropbox 409",
  );
});
