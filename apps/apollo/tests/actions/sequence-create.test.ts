import { assertEquals } from "@std/assert";
import sequenceCreate from "../../actions/sequence-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-create: POSTs to /sequences and merges `settings` into the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { emailer_campaign: { id: "seq1", name: "Outbound" } },
  }]);
  const out = await sequenceCreate.execute(
    { name: "Outbound", active: true, settings: { max_emails_per_day: 50 } },
    ctx,
  ) as { sequence: { name: string } };

  assertEquals(pathOf(calls[0].url), "/api/v1/sequences");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Outbound",
    active: true,
    max_emails_per_day: 50,
  });
  assertEquals(out.sequence.name, "Outbound");
});

Deno.test("sequence-create: label_names is comma-split into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { emailer_campaign: { id: "seq1" } } }]);
  await sequenceCreate.execute({ name: "X", label_names: "A, B" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).label_names, ["A", "B"]);
});
