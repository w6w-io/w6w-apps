import { assertEquals } from "@std/assert";
import listAddRecords from "../../actions/list-add-records.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-add-records: POSTs a JSON body and unwraps the `labels` envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { labels: [{ id: "l1" }] } }]);
  const out = await listAddRecords.execute(
    { entity_ids: "c1,c2", label_names: "VIP", modality: "contacts" },
    ctx,
  ) as { lists: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/labels/add_entity_ids_to_label_names");
  assertEquals(JSON.parse(calls[0].body!), {
    entity_ids: ["c1", "c2"],
    label_names: ["VIP"],
    modality: "contacts",
  });
  assertEquals(out.lists.length, 1);
});

Deno.test("list-add-records: idempotent", () => {
  assertEquals(listAddRecords.idempotent, true);
});
