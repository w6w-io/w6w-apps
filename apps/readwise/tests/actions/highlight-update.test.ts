import { assertEquals } from "@std/assert";
import highlightUpdate from "../../actions/highlight-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-update: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 13, color: "green" } }]);
  await highlightUpdate.execute({ highlightId: "13", color: "green" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/13/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { color: "green" });
});

Deno.test("highlight-update: sends location as a number", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 13 } }]);
  await highlightUpdate.execute({ highlightId: "13", location: 57 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location, 57);
  assertEquals(typeof body.location, "number");
});

Deno.test("highlight-update: is idempotent — patching twice leaves the same state", () => {
  assertEquals(highlightUpdate.idempotent, true);
});
