import { assert, assertEquals, assertRejects } from "@std/assert";
import callTag from "../../actions/call-tag.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-tag: POSTs /v1/calls/{id}/tags with numeric tag IDs", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const out = await callTag.execute({ callId: "812", tags: ["545", "678"] }, ctx) as {
    status: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812/tags");
  // Numbers, not strings: Aircall's own example body is `{"tags": [545]}`.
  assertEquals(bodyOf(calls[0]), { tags: [545, 678] });
  assertEquals(out.status, 201);
});

Deno.test("call-tag: an empty tag list is rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(callTag.execute({ callId: "812", tags: [] }, ctx)),
    Error,
  );
  assert(err.message.includes("at least one numeric Tag ID"), err.message);
  assertEquals(calls.length, 0);
});
