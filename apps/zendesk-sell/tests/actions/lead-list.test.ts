import { assertEquals } from "@std/assert";
import leadList from "../../actions/lead-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lead-list: unwraps items and maps filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await leadList.execute({ organizationName: "Acme", ids: "1,2,3" }, ctx) as {
    items: unknown[];
    count: number;
  };

  assertEquals(pathOf(calls[0].url), "/v2/leads");
  assertEquals(queryOf(calls[0].url), { organization_name: "Acme", ids: "1,2,3" });
  assertEquals(out.items, [{ id: 1 }]);
  assertEquals(out.count, 1);
});
