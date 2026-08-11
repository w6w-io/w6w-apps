import { assert, assertEquals, assertRejects } from "@std/assert";
import callComment from "../../actions/call-comment.ts";
import { appErrorBody, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-comment: POSTs /v1/calls/{id}/comments with the content", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const out = await callComment.execute({ callId: "812", content: "Call back" }, ctx) as {
    status: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812/comments");
  assertEquals(bodyOf(calls[0]), { content: "Call back" });
  assertEquals(out.status, 201);
});

/** The five-comment ceiling arrives as a 400, and its reason must survive. */
Deno.test("call-comment: the five-note ceiling surfaces its vendor message", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: appErrorBody("Bad Request", "Maximum of 5 notes can be added to a Call."),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(callComment.execute({ callId: "812", content: "sixth" }, ctx)),
    Error,
  );
  assert(err.message.includes("Maximum of 5 notes"), err.message);
});

Deno.test("call-comment: the request carries a JSON content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await callComment.execute({ callId: "812", content: "hi" }, ctx);
  assertEquals(calls[0].headers["content-type"], "application/json");
});
