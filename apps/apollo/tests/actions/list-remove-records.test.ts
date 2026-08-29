import { assertEquals } from "@std/assert";
import listRemoveRecords from "../../actions/list-remove-records.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-remove-records: POSTs a JSON body and unwraps the `labels` envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { labels: [{ id: "l1" }] } }]);
  const out = await listRemoveRecords.execute(
    { entity_ids: "c1", label_names: "VIP", modality: "contacts" },
    ctx,
  ) as { lists: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/labels/remove_entity_ids_from_label_names");
  assertEquals(JSON.parse(calls[0].body!), {
    entity_ids: ["c1"],
    label_names: ["VIP"],
    modality: "contacts",
  });
  assertEquals(out.lists.length, 1);
});

Deno.test("list-remove-records: idempotent", () => {
  assertEquals(listRemoveRecords.idempotent, true);
});
