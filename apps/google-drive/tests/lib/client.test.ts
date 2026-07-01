import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { GoogleDriveClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GoogleDriveClient(ctx);
  const result = await client.request("/files/x", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new GoogleDriveClient(ctx);
  await assertRejects(
    () => client.request("/files/missing"),
    Error,
    "Google Drive 404",
  );
});

Deno.test("client: multipartUpload sends multipart/related with metadata + content", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "up-1" } }]);
  const client = new GoogleDriveClient(ctx);
  await client.multipartUpload(
    { name: "hi.txt", parents: ["root"] },
    "hello",
    "text/plain",
    { supportsAllDrives: true },
  );

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/upload/drive/v3/files");
  assertEquals(url.searchParams.get("uploadType"), "multipart");
  assertEquals(calls[0].headers["content-type"].startsWith("multipart/related;"), true);
  const bytes = new Uint8Array(calls[0].body!.split(",").map(Number));
  const decoded = new TextDecoder().decode(bytes);
  assertEquals(decoded.includes(`"name":"hi.txt"`), true);
  assertEquals(decoded.includes("hello"), true);
});

Deno.test("client: simpleUpload posts with uploadType=media and the raw content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "up-2" } }]);
  const client = new GoogleDriveClient(ctx);
  await client.simpleUpload("plain text", "text/plain");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/upload/drive/v3/files");
  assertEquals(url.searchParams.get("uploadType"), "media");
  assertEquals(calls[0].headers["content-type"], "text/plain");
});
