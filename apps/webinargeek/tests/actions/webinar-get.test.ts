import { assertEquals } from "@std/assert";
import webinarGet from "../../actions/webinar-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webinar-get: hits GET /webinars/{id} and returns the raw body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, title: "My webinar" } }]);
  const out = await webinarGet.execute({ id: 1, includePast: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/webinars/1");
  assertEquals(queryOf(calls[0].url).include_past, "true");
  assertEquals(out, { id: 1, title: "My webinar" });
});
