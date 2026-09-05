import { assertEquals, assertRejects } from "@std/assert";
import spaceUserGet from "../../actions/space-user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-user-get: GETs /space/user/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, firstName: "Ada", role: "agent" } }]);
  const out = await spaceUserGet.execute({ id: 7 }, ctx) as { id: number };

  assertEquals(pathOf(calls[0].url), "/v2/space/user/7");
  assertEquals(out.id, 7);
});

Deno.test("space-user-get: a missing id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await spaceUserGet.execute({ id: undefined as unknown as number }, ctx),
    Error,
    "User ID is required",
  );
  assertEquals(calls.length, 0);
});
