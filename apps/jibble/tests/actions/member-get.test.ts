import { assertEquals, assertRejects } from "@std/assert";
import memberGet from "../../actions/member-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-get: addresses People(id) unquoted", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", fullName: "John Doe" } }]);
  const out = await memberGet.execute({ personId: "p1" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/v1/People(p1)");
  assertEquals(out.id, "p1");
});

Deno.test("member-get: requires personId", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(memberGet.execute({ personId: "" }, ctx)),
    Error,
    "personId",
  );
});
