import { assertEquals } from "@std/assert";
import userDashboardGet from "../../actions/user-dashboard-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-dashboard-get: calls GET /v2/user/dashboard with the type/sinceId query", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ posts: [] }) }]);
  await userDashboardGet.execute({ type: "photo", sinceId: 42, npf: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/dashboard");
  assertEquals(queryOf(calls[0].url), { type: "photo", since_id: "42", npf: "true" });
});
