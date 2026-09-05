import { assertEquals } from "@std/assert";
import getMatter from "../../actions/get-matter.ts";
import { item, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-matter: hits GET /v1/prospects/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: item("25", "prospect", { first_name: "Tyrion" }) }]);
  const out = await getMatter.execute({ matterId: "25" }, ctx) as { id: string; type: string };

  assertEquals(pathOf(calls[0].url), "/v1/prospects/25");
  assertEquals(out.id, "25");
  assertEquals(out.type, "prospect");
});

Deno.test("get-matter: forwards fields=all", async () => {
  const { ctx, calls } = mockCtx([{ body: item("25", "prospect", {}) }]);
  await getMatter.execute({ matterId: "25", fields: "all" }, ctx);
  assertEquals(queryOf(calls[0].url), { fields: "all" });
});
