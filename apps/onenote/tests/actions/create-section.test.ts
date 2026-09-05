import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-section.ts";

Deno.test("create-section: under a notebook", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sec1" } }]);
  await action.execute({ notebookId: "n1", displayName: "New section" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks/n1/sections");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "New section" });
});

Deno.test("create-section: under a section group", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "sec1" } }]);
  await action.execute({ sectionGroupId: "sg1", displayName: "New section" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sectionGroups/sg1/sections");
});

Deno.test("create-section: neither parent set is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ displayName: "orphan" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("exactly one parent"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("create-section: both parents set is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ notebookId: "n1", sectionGroupId: "sg1", displayName: "x" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("not both"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("create-section: mints a new resource each call — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
