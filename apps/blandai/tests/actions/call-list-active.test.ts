import { assertEquals } from "@std/assert";
import callListActive from "../../actions/call-list-active.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-list-active: unwraps the {data, errors} envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ call_id: "c-1", status: "QUEUED" }], errors: null },
  }]);
  const out = await callListActive.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/calls/active");
  assertEquals(out.calls, [{ call_id: "c-1", status: "QUEUED" }]);
});

Deno.test("call-list-active: sends x-bland-org-id only when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], errors: null } }]);
  await callListActive.execute({ orgId: "org-1" }, ctx);
  assertEquals(calls[0].headers["x-bland-org-id"], "org-1");
});

Deno.test("call-list-active: omits x-bland-org-id when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], errors: null } }]);
  await callListActive.execute({}, ctx);
  assertEquals("x-bland-org-id" in calls[0].headers, false);
});

Deno.test("call-list-active: defaults to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: null, errors: null } }]);
  const out = await callListActive.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.calls, []);
});
