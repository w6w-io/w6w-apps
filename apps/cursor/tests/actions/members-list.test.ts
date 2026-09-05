import { assertEquals } from "@std/assert";
import membersList from "../../actions/members-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("members-list: calls GET /teams/members and returns teamMembers", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        teamMembers: [
          { id: "user_1", name: "Alex", email: "a@co.com", role: "member", isRemoved: false },
        ],
      },
    },
  ]);
  const out = await membersList.execute({}, ctx) as { teamMembers: unknown[] };
  assertEquals(pathOf(calls[0].url), "/teams/members");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.teamMembers.length, 1);
});

Deno.test("members-list: defaults to an empty array when teamMembers is missing", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await membersList.execute({}, ctx) as { teamMembers: unknown[] };
  assertEquals(out.teamMembers, []);
});

Deno.test("members-list: takes no parameters", () => {
  assertEquals(membersList.params?.length, 0);
});
