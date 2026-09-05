import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-section.ts";

Deno.test("get-section: addresses /me/onenote/sections/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sec1" } }]);
  await action.execute({ sectionId: "sec1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sections/sec1");
});

Deno.test("get-section: is a read action grouped under the section resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "section");
});
