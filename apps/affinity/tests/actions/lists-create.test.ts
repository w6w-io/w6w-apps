import { assertEquals } from "@std/assert";
import listsCreate from "../../actions/lists-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lists-create: POSTs the name/type/is_public payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 383, name: "My List of Organizations" } }]);
  await listsCreate.execute(
    { name: "My List of Organizations", type: 1, isPublic: true, ownerId: 38706 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/lists");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    name: "My List of Organizations",
    type: 1,
    is_public: true,
    owner_id: 38706,
  });
});
