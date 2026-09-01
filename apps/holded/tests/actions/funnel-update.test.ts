import { assertEquals, assertThrows } from "@std/assert";
import funnelUpdate from "../../actions/funnel-update.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("funnel-update: metadata — idempotent partial update", () => {
  assertEquals(funnelUpdate.type, "perform");
  assertEquals(funnelUpdate.idempotent, true);
});

Deno.test("funnel-update: PUT with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "f1") }]);
  const result = asMutation(
    await funnelUpdate.execute({ funnelId: "f1", name: "Renamed" }, ctx),
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/funnels/f1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
  assertEquals(result.info, "Updated");
});

Deno.test("funnel-update: stages and labels are parsed from JSON strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "f1") }]);
  await funnelUpdate.execute({
    funnelId: "f1",
    stages: '[{"name":"Lead In","desc":""}]',
    labels: '[{"labelName":"Marketing","labelColor":"#33ffff"}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    stages: [{ name: "Lead In", desc: "" }],
    labels: [{ labelName: "Marketing", labelColor: "#33ffff" }],
  });
});

Deno.test("funnel-update: bad JSON in stages throws a labelled error", () => {
  const { ctx } = mockCtx([]);
  // asOptionalJson throws synchronously (execute is not `async`), so this is
  // a thrown exception, not a rejected promise.
  assertThrows(
    () => funnelUpdate.execute({ funnelId: "f1", stages: "{not json" }, ctx),
    Error,
    "Stages is not valid JSON",
  );
});

Deno.test("funnel-update: no optional field set -> empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: writeResult("Updated", "f1") }]);
  await funnelUpdate.execute({ funnelId: "f1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
