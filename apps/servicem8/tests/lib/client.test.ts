import { assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  encodeId,
  filterCondition,
  formatServiceM8Error,
  ServiceM8Client,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf, result } from "../_helpers.ts";

Deno.test("client: list() folds the bare array + x-next-cursor header", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ uuid: "j1" }, { uuid: "j2" }], headers: { "x-next-cursor": "abc-123" } },
  ]);
  const out = await new ServiceM8Client(ctx).list("/job.json", { query: { cursor: "-1" } });

  assertEquals(pathOf(calls[0].url), "/api_1.0/job.json");
  assertEquals(queryOf(calls[0].url), { cursor: "-1" });
  assertEquals(out.items, [{ uuid: "j1" }, { uuid: "j2" }]);
  assertEquals(out.nextCursor, "abc-123");
});

Deno.test("client: list() reports no nextCursor on the last page", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await new ServiceM8Client(ctx).list("/job.json");
  assertEquals(out.nextCursor, undefined);
});

Deno.test("client: create() reads the uuid from x-record-uuid, not the body", async () => {
  const { ctx, calls } = mockCtx([
    { body: result(0, "OK"), headers: { "x-record-uuid": "new-uuid-1" } },
  ]);
  const { uuid, result: body } = await new ServiceM8Client(ctx).create("/job.json", {
    status: "Quote",
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { status: "Quote" });
  assertEquals(uuid, "new-uuid-1");
  assertEquals(body, { errorCode: 0, message: "OK" });
});

Deno.test("client: update() sends POST to the record path", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  const out = await new ServiceM8Client(ctx).update(`/job/${encodeId("j-1")}.json`, {
    status: "Completed",
  });
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/j-1.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { errorCode: 0, message: "OK" });
});

Deno.test("client: archive() sends DELETE", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  await new ServiceM8Client(ctx).archive(`/job/${encodeId("j-1")}.json`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api_1.0/job/j-1.json");
});

Deno.test("client: a non-ok response throws with the parsed JSON error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorCode: 401, message: "Authorization Required" },
  }]);
  await assertRejects(
    () => new ServiceM8Client(ctx).json("/vendor.json"),
    Error,
    "Authorization Required",
  );
});

Deno.test("client: a non-JSON error body is not silently swallowed", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "Authorization Required", headers: { "content-type": "text/html" } },
  ]);
  await assertRejects(
    () => new ServiceM8Client(ctx).json("/vendor.json"),
    Error,
    "Authorization Required",
  );
});

Deno.test("encodeId: escapes a path-breaking character", () => {
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("filterCondition: quotes strings, leaves numbers bare", () => {
  assertEquals(filterCondition("status", "eq", "Work Order"), "status eq 'Work Order'");
  assertEquals(filterCondition("total_price", "gt", 1000), "total_price gt 1000");
});

Deno.test("filterCondition: escapes an embedded single quote", () => {
  assertEquals(filterCondition("name", "eq", "O'Brien"), "name eq 'O''Brien'");
});

Deno.test("formatServiceM8Error: reads the documented JSON shape", () => {
  const msg = formatServiceM8Error(
    401,
    "GET",
    "/vendor.json",
    JSON.stringify({ errorCode: 401, message: "Authorization Required" }),
  );
  assertEquals(msg.includes("errorCode 401"), true);
  assertEquals(msg.includes("Authorization Required"), true);
});

Deno.test("formatServiceM8Error: falls back to raw text for a non-JSON (plain-text) body", () => {
  const msg = formatServiceM8Error(401, "GET", "/vendor.json", "Authorization Required");
  assertEquals(msg.includes("Authorization Required"), true);
});

Deno.test("API_BASE is the documented single origin", () => {
  assertEquals(API_BASE, "https://api.servicem8.com/api_1.0");
});
