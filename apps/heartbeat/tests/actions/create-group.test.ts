import { assertEquals } from "@std/assert";
import createGroup from "../../actions/create-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-group: PUT /groups with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await createGroup.execute({ name: "Cohort 1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/groups");
  assertEquals(JSON.parse(calls[0].body!), { name: "Cohort 1" });
});

Deno.test("create-group: is not idempotent", () => {
  assertEquals(createGroup.idempotent, false);
});
