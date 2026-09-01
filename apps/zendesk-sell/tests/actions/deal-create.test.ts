import { assertEquals } from "@std/assert";
import dealCreate from "../../actions/deal-create.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("deal-create: sends value as a string and posts meta.type", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, name: "Website Redesign" }) }]);
  await dealCreate.execute({ name: "Website Redesign", contactId: 1, value: "1000.50" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/deals");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.meta, { type: "deal" });
  assertEquals(body.data.value, "1000.50");
  assertEquals(typeof body.data.value, "string");
  assertEquals(body.data.contact_id, 1);
});
