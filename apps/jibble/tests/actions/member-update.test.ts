import { assertEquals, assertRejects } from "@std/assert";
import memberUpdate from "../../actions/member-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-update: PATCHes People(id) and reports ok on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await memberUpdate.execute({ personId: "p1", fullName: "New Name" }, ctx) as {
    ok: boolean;
  };
  assertEquals(pathOf(calls[0].url), "/v1/People(p1)");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { fullName: "New Name" });
  assertEquals(out.ok, true);
});

Deno.test("member-update: refuses an empty update", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(memberUpdate.execute({ personId: "p1" }, ctx)),
    Error,
    "at least one field",
  );
});
