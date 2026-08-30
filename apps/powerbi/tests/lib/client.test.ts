import { assert, assertEquals } from "@std/assert";
import { compact, encodeBase64, groupPath, PowerBIClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

// ------------------------------------------------------------- groupPath --

Deno.test("groupPath: no Workspace ID means My workspace — an empty path segment", () => {
  assertEquals(groupPath({}), "");
  assertEquals(groupPath(), "");
});

Deno.test("groupPath: a Workspace ID becomes /groups/{id}, percent-encoded", () => {
  assertEquals(
    groupPath({ groupId: "f089354e-8366-4e18-aea3-4cb4a3a50b48" }),
    "/groups/f089354e-8366-4e18-aea3-4cb4a3a50b48",
  );
  assertEquals(groupPath({ groupId: "a b" }), "/groups/a%20b");
});

// ------------------------------------------------------------------ compact --

Deno.test("compact: drops only undefined entries", () => {
  assertEquals(compact({ a: 1, b: undefined, c: 0, d: null }), { a: 1, c: 0, d: null });
});

// ------------------------------------------------------------ encodeBase64 --

Deno.test("encodeBase64: round-trips through atob", () => {
  const bytes = new TextEncoder().encode("hello power bi");
  const encoded = encodeBase64(bytes);
  const decoded = atob(encoded);
  assertEquals(decoded, "hello power bi");
});

// -------------------------------------------------------------- PowerBIClient --

Deno.test("PowerBIClient.request: hits api.powerbi.com/v1.0/myorg", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  const client = new PowerBIClient(ctx);
  await client.request("/groups");
  assertEquals(calls[0].url, "https://api.powerbi.com/v1.0/myorg/groups");
});

Deno.test("PowerBIClient.list: unwraps `{ value: [...] }`", async () => {
  const { ctx } = mockCtx([{ body: { value: [{ id: "1" }, { id: "2" }] } }]);
  const client = new PowerBIClient(ctx);
  const value = await client.list("/reports");
  assertEquals(value.length, 2);
});

Deno.test("PowerBIClient.status: reports the HTTP status without decoding a body", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  const client = new PowerBIClient(ctx);
  const out = await client.status("/groups/x", { method: "DELETE" });
  assertEquals(out.status, 200);
});

Deno.test("PowerBIClient.accepted: surfaces x-ms-request-id and Location on a 202", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    headers: {
      "x-ms-request-id": "req-1",
      "location": "https://api.powerbi.com/v1.0/myorg/datasets/d1/refreshes/1",
    },
  }]);
  const client = new PowerBIClient(ctx);
  const out = await client.accepted("/datasets/d1/refreshes", { method: "POST" });
  assertEquals(out.status, 202);
  assertEquals(out.requestId, "req-1");
  assertEquals(out.location, "https://api.powerbi.com/v1.0/myorg/datasets/d1/refreshes/1");
});

Deno.test("PowerBIClient.binary: returns raw bytes and content-type, never JSON-decoded", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "%PDF-1.4 fake bytes",
    headers: { "content-type": "application/pdf" },
  }]);
  const client = new PowerBIClient(ctx);
  const { bytes, contentType } = await client.binary("/reports/r1/exports/e1/file");
  assertEquals(contentType, "application/pdf");
  assertEquals(new TextDecoder().decode(bytes), "%PDF-1.4 fake bytes");
});

// -------------------------------------------------- error classification --

Deno.test("PowerBIClient: an auth failure with no body still surfaces the x-powerbi-error-info header", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    statusText: "Forbidden",
    headers: { "x-powerbi-error-info": "InvalidToken" },
    // no body — mirrors the live, verified 403/content-length:0 response.
  }]);
  const client = new PowerBIClient(ctx);
  try {
    await client.request("/groups");
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("InvalidToken"), (e as Error).message);
    assert((e as Error).message.includes("403"), (e as Error).message);
  }
});

Deno.test("PowerBIClient: a validation failure with a JSON body surfaces the vendor's error code/message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    headers: { "content-type": "application/json" },
    body: { error: { code: "DAXQueryFailure", message: "The expression is invalid." } },
  }]);
  const client = new PowerBIClient(ctx);
  try {
    await client.request("/datasets/d1/executeQueries", { method: "POST" });
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("DAXQueryFailure"), (e as Error).message);
    assert((e as Error).message.includes("expression is invalid"), (e as Error).message);
  }
});
