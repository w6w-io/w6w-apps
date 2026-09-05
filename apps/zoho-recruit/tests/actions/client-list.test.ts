import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

Deno.test("client-list: GETs /Clients with paging params", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [{ id: "1" }], info: { count: 1 } } }]);
  const out = await action.execute({ page: 1, per_page: 100 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Clients");
  assertEquals(out, { data: [{ id: "1" }], info: { count: 1 } });
});
