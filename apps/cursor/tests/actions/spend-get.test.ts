import { assertEquals } from "@std/assert";
import spendGet from "../../actions/spend-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("spend-get: posts filters to /teams/spend", async () => {
  const { ctx, calls } = mockCtx([
    { body: { teamMemberSpend: [], subscriptionCycleStart: 1, totalMembers: 0, totalPages: 0 } },
  ]);
  await spendGet.execute({ searchTerm: "alex@company.com", page: 2, pageSize: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/spend");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { searchTerm: "alex@company.com", page: 2, pageSize: 25 },
  );
});

Deno.test("spend-get: defaults pageSize to 25", () => {
  const pageSize = spendGet.params?.find((p) => p.key === "pageSize");
  assertEquals(pageSize?.default, 25);
});
