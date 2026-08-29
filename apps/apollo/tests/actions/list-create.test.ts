import { assertEquals } from "@std/assert";
import listCreate from "../../actions/list-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-create: POSTs to /labels and unwraps the `label` envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { label: { id: "l1", name: "VIP", modality: "contacts" } },
  }]);
  const out = await listCreate.execute({ name: "VIP", modality: "contacts" }, ctx) as {
    list: { name: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/labels");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP", modality: "contacts" });
  assertEquals(out.list.name, "VIP");
});
