import { assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asOptionalJson,
  compact,
  encodeId,
  formatHoldedError,
  HoldedClient,
  toStringList,
} from "../../lib/client.ts";
import { API_ROOT, errorBody, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("client: API_BASE is the CRM v1 host", () => {
  assertEquals(API_BASE, "https://api.holded.com/api/crm/v1");
  assertEquals(API_BASE, API_ROOT);
});

Deno.test("client.get: returns the bare array for a list endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "f1" }] }]);
  const funnels = await new HoldedClient(ctx).get<unknown[]>("/funnels");
  assertEquals(funnels, [{ id: "f1" }]);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels");
});

Deno.test("client.get: returns the object for a single-record endpoint", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "f1", name: "Marketing" } }]);
  const funnel = await new HoldedClient(ctx).get<Record<string, unknown>>("/funnels/f1");
  assertEquals(funnel, { id: "f1", name: "Marketing" });
});

Deno.test("client.write: POST sends JSON body and returns the write envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  const result = await new HoldedClient(ctx).write("/funnels", "POST", { name: "New" });
  assertEquals(result, { status: 1, info: "Created", id: "new-id" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
});

Deno.test("client.write: PUT is a partial update, same envelope shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "f1") }]);
  const result = await new HoldedClient(ctx).write("/funnels/f1", "PUT", { name: "Renamed" });
  assertEquals(result.info, "Updated");
  assertEquals(calls[0].method, "PUT");
});

Deno.test("client.delete: DELETE with no body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: writeResult("Successfully deleted", "f1"),
  }]);
  const result = await new HoldedClient(ctx).delete("/funnels/f1");
  assertEquals(result.info, "Successfully deleted");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("client.delete: DELETE with a body (Delete Lead Task's shape)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Successfully deleted") }]);
  await new HoldedClient(ctx).delete("/leads/l1/tasks", { taskId: "t1" });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { taskId: "t1" });
});

Deno.test("client: gateway-layer 401 with no info throws a status-only message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: 401 } }]);
  await assertRejects(
    () => new HoldedClient(ctx).get("/funnels"),
    Error,
    "Holded 401 for GET /api/crm/v1/funnels",
  );
});

Deno.test("client: app-layer error carries info in the thrown message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Invalid key") }]);
  await assertRejects(
    () => new HoldedClient(ctx).get("/funnels"),
    Error,
    "Invalid key",
  );
});

Deno.test("formatHoldedError: no info -> status-only, with info -> appended", () => {
  assertEquals(
    formatHoldedError(401, "GET", "/funnels", null),
    "Holded 401 for GET /funnels",
  );
  assertEquals(
    formatHoldedError(400, "GET", "/funnels", { status: 0, info: "Invalid key" }),
    "Holded 400 for GET /funnels: Invalid key",
  );
});

Deno.test("compact: drops undefined, null and empty-string values; keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false, g: "x" }),
    { a: 1, e: 0, f: false, g: "x" },
  );
});

Deno.test("encodeId: escapes path-breaking characters", () => {
  assertEquals(encodeId("abc/def?x=1"), encodeURIComponent("abc/def?x=1"));
  assertEquals(encodeId("  abc  "), "abc");
});

Deno.test("asOptionalJson: parses a string, passes through a value, rejects bad JSON", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "field"), { a: 1 });
  assertEquals(asOptionalJson<number[]>([1, 2] as unknown as string, "field"), [1, 2]);
  assertEquals(asOptionalJson(undefined, "field"), undefined);
  assertEquals(asOptionalJson("", "field"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "Stages");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Stages is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("toStringList: splits a comma string, passes an array through, drops empties", () => {
  assertEquals(toStringList("a,b, c"), ["a", "b", "c"]);
  assertEquals(toStringList(["a", "b"]), ["a", "b"]);
  assertEquals(toStringList(""), undefined);
  assertEquals(toStringList(undefined), undefined);
});
