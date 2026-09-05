import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-page-content.ts";

Deno.test("update-page-content: PATCHes the page's content endpoint with the commands array", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const commands = [{ target: "body", action: "append" as const, content: "<p>more</p>" }];
  const out = await action.execute({ pageId: "p1", commands }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/pages/p1/content");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), commands);
  assertEquals(out.status, 204);
});

Deno.test("update-page-content: an empty commands array is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ pageId: "p1", commands: [] }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("non-empty"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("update-page-content: does not declare idempotent true — append/prepend are not safe to retry", () => {
  assertEquals(action.idempotent, false);
});
