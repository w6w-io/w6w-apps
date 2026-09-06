import { assertEquals, assertThrows } from "@std/assert";
import stashData from "../../actions/stash-data.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("stash-data: PUTs the rows array to /stashes/{id}/{serial}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await stashData.execute({ stashId: "20240215-job32", serial: "1", rows: [{ a: 1 }] }, ctx);

  assertEquals(pathOf(calls[0].url), "/stashes/20240215-job32/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), [{ a: 1 }]);
});

Deno.test("stash-data: rejects an invalid stash id or serial before the request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => stashData.execute({ stashId: "-bad-", serial: "1", rows: [] }, ctx));
  assertThrows(() => stashData.execute({ stashId: "ok", serial: "has space", rows: [] }, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("stash-data: marked idempotent — a PUT to the same id/serial replaces the chunk", () => {
  assertEquals(stashData.idempotent, true);
});
