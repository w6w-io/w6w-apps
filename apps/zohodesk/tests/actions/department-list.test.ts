import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/department-list.ts";

Deno.test("department-list: GETs /departments with isEnabled filter", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ isEnabled: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/departments");
  assertEquals(url.searchParams.get("isEnabled"), "true");
  assertEquals(out.data, [{ id: "1" }]);
});
