import { assertEquals } from "@std/assert";
import { mockWorkableCtx } from "../_helpers.ts";
import action from "../../actions/candidate-disqualify.ts";

Deno.test("candidate-disqualify: POSTs /candidates/:id/disqualify and returns the status", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 200, body: " " }]);
  const out = await action.execute({
    id: "c1",
    memberId: "m1",
    disqualifyReasonId: "r1",
    disqualifyNote: "not a fit",
    withdrew: false,
  }, ctx);
  assertEquals(calls[0].url, "https://acme.workable.com/spi/v3/candidates/c1/disqualify");
  assertEquals(JSON.parse(calls[0].body!), {
    member_id: "m1",
    disqualify_reason_id: "r1",
    disqualify_note: "not a fit",
    withdrew: false,
  });
  assertEquals(out, { status: 200 });
});

Deno.test("candidate-disqualify: withdrew: false survives compact() (it is not treated as unset)", async () => {
  const { ctx, calls } = mockWorkableCtx([{ status: 200, body: " " }]);
  await action.execute({ id: "c1", memberId: "m1", withdrew: false }, ctx);
  assertEquals("withdrew" in JSON.parse(calls[0].body!), true);
});
