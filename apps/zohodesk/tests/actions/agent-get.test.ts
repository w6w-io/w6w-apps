import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/agent-get.ts";

Deno.test("agent-get: GETs /agents/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "9", lastName: "case" } }]);
  const out = await action.execute({ recordId: "9", include: "profile,role" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/agents/9");
  assertEquals(url.searchParams.get("include"), "profile,role");
  assertEquals(out, { id: "9", lastName: "case" });
});
