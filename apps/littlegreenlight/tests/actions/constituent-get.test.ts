import { assertEquals } from "@std/assert";
import constituentGet from "../../actions/constituent-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("constituent-get: hits /api/v1/constituents/{id}.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, first_name: "Ada", last_name: "Lovelace" } }]);
  const out = await constituentGet.execute({ id: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents/7.json");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 7, first_name: "Ada", last_name: "Lovelace" });
});
