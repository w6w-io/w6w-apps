import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-section-group.ts";

Deno.test("create-section-group: under a notebook", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sg1" } }]);
  await action.execute({ notebookId: "n1", displayName: "New group" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks/n1/sectionGroups");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "New group" });
});

Deno.test("create-section-group: nested under another section group", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sg2" } }]);
  await action.execute({ sectionGroupId: "sg1", displayName: "Nested" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sectionGroups/sg1/sectionGroups");
});

Deno.test("create-section-group: neither parent set is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ displayName: "orphan" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("exactly one parent"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("create-section-group: mints a new resource each call — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
