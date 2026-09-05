import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: ok when maxitem.json answers a plausible positive integer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "9130260" }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/maxitem.json");
  assertEquals(out.state, "ok");
});

Deno.test("service: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "Hacker News API returned 503");
});

Deno.test("service: unknown on a non-5xx error status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when the body is not a plausible integer", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "not-a-number" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when the body is null (empty/no id)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "null" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: down when the fetch itself throws", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("network unreachable")),
    log: () => {},
  } as unknown as HookContext;
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: declares no credential and app scope", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});
