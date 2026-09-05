import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-notebook.ts";

Deno.test("get-notebook: addresses /me/onenote/notebooks/{id} by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await action.execute({ notebookId: "n1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks/n1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-notebook: a site location addresses /sites/{id}/onenote", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ location: "site", locationId: "s1", notebookId: "n1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/s1/onenote/notebooks/n1");
});

Deno.test("get-notebook: a non-me location with no Location ID throws before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  try {
    await action.execute({ location: "user", notebookId: "n1" }, ctx);
    throw new Error("expected a throw");
  } catch (e) {
    assert((e as Error).message.includes("Location ID"));
  }
  assertEquals(calls.length, 0);
});

Deno.test("get-notebook: $select and $expand ride as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ notebookId: "n1", select: ["displayName"], expand: ["sections"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "displayName");
  assertEquals(url.searchParams.get("$expand"), "sections");
});
