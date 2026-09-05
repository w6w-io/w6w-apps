import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-sections.ts";

Deno.test("list-sections: no container means the flat listing", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sections");
});

Deno.test("list-sections: Notebook ID scopes to that notebook", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ notebookId: "n1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks/n1/sections");
});

Deno.test("list-sections: Section Group ID scopes to that section group", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ sectionGroupId: "sg1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sectionGroups/sg1/sections");
});

Deno.test("list-sections: Notebook ID and Section Group ID together is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ notebookId: "n1", sectionGroupId: "sg1" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("not both"));
  }
  assertEquals(calls.length, 0);
});
