import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-is-member.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("list-is-member: GETs /rest/v1/lists/{listId}/leads/ismember.json", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        success: true,
        result: [{ id: 1, status: "memberof" }, { id: 2, status: "notmemberof" }],
      },
    },
  ], conn);
  const out = await action.execute!({ listId: 100, leadIds: "1,2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v1/lists/100/leads/ismember.json");
  assertEquals(url.searchParams.getAll("id"), ["1", "2"]);
  assertEquals(out, [{ id: 1, status: "memberof" }, { id: 2, status: "notmemberof" }]);
});

Deno.test("list-is-member: status is a string, never coerced to a boolean", () => {
  const output = action.output as Array<{ key: string }>;
  assertEquals(output.some((o) => o.key === "result"), true);
});
