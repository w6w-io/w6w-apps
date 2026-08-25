import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/agent-list.ts";

Deno.test("agent-list: GETs /agents with a status filter", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ status: "ACTIVE" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/agents");
  assertEquals(url.searchParams.get("status"), "ACTIVE");
  assertEquals(out.data, [{ id: "1" }]);
});
