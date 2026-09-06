import { assertEquals, assertRejects } from "@std/assert";
import writeLeadEvent from "../../actions/write-lead-event.ts";
import { mockCtx, pathOf, yelpError } from "../_helpers.ts";

Deno.test("write-lead-event: POSTs request_content with a fixed TEXT request_type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await writeLeadEvent.execute({ leadId: "abc", requestContent: "We'll be there at 3pm" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/leads/abc/events");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    request_content: "We'll be there at 3pm",
    request_type: "TEXT",
  });
});

Deno.test("write-lead-event: surfaces the SAME_SUCCESSIVE_MESSAGE guard verbatim", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: yelpError(
        "SAME_SUCCESSIVE_MESSAGE",
        "Same successive message sent to the same lead within the last hour.",
      ),
    },
  ]);
  await assertRejects(
    async () => await writeLeadEvent.execute({ leadId: "abc", requestContent: "hi" }, ctx),
    Error,
    "SAME_SUCCESSIVE_MESSAGE",
  );
});

Deno.test("write-lead-event: is declared not idempotent", () => {
  assertEquals(writeLeadEvent.idempotent, false);
});
