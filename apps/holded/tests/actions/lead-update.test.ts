import { assertEquals, assertThrows } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("lead-update: metadata — idempotent partial update", () => {
  assertEquals(leadUpdate.type, "perform");
  assertEquals(leadUpdate.idempotent, true);
});

Deno.test("lead-update: PUT /leads/{leadId} with the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "l1") }]);
  const result = asMutation(
    await leadUpdate.execute({ leadId: "l1", name: "Gumersindo", value: 48000 }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Gumersindo", value: 48000 });
  assertEquals(result.info, "Updated");
});

Deno.test("lead-update: customFields is parsed from a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "l1") }]);
  await leadUpdate.execute({
    leadId: "l1",
    customFields: '[{"field":"Source","value":"Website"}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    customFields: [{ field: "Source", value: "Website" }],
  });
});

Deno.test("lead-update: status 0 survives compact() (falsy but meaningful)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "l1") }]);
  await leadUpdate.execute({ leadId: "l1", status: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: 0 });
});

Deno.test("lead-update: bad JSON in customFields throws a labelled error", () => {
  const { ctx } = mockCtx([]);
  // asOptionalJson throws synchronously (execute is not `async`), so this is
  // a thrown exception, not a rejected promise.
  assertThrows(
    () => leadUpdate.execute({ leadId: "l1", customFields: "nope" }, ctx),
    Error,
    "Custom fields is not valid JSON",
  );
});
