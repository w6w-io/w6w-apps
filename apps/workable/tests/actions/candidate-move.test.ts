import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-move.ts";

Deno.test("candidate-move: POSTs /candidates/:id/move and returns the status, not a parsed body", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ id: "c1", memberId: "m1", targetStage: "interview" }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates/c1/move");
  assertEquals(JSON.parse(calls[0].body!), { member_id: "m1", target_stage: "interview" });
  assertEquals(out, { status: 202 });
});

Deno.test("candidate-move: targetStage is optional", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 202, body: undefined }]);
  await action.execute({ id: "c1", memberId: "m1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { member_id: "m1" });
});
