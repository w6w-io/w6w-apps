import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/department-get.ts";

Deno.test("department-get: GETs /departments/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "5", name: "Zylker" } }]);
  const out = await action.execute({ recordId: "5" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/departments/5");
  assertEquals(out, { id: "5", name: "Zylker" });
});
