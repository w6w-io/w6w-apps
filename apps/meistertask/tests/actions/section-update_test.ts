import { assertEquals } from "@std/assert";
import sectionUpdate from "../../actions/section-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("section-update: PUT /sections/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await sectionUpdate.execute({ id: 61, name: "Renamed", status: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/sections/61");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", status: 2 });
  assertEquals(out, {});
});
