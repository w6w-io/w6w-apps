import { assertEquals } from "@std/assert";
import jobMaterialList from "../../actions/jobmaterial-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("jobmaterial-list: calls GET /jobmaterial.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "m1" }] }]);
  const out = await jobMaterialList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/jobmaterial.json");
  assertEquals(out.items, [{ uuid: "m1" }]);
});
