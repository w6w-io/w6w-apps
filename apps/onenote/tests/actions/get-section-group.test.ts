import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-section-group.ts";

Deno.test("get-section-group: addresses /me/onenote/sectionGroups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sg1" } }]);
  await action.execute({ sectionGroupId: "sg1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sectionGroups/sg1");
});

Deno.test("get-section-group: is a read action grouped under the section-group resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "section-group");
});
