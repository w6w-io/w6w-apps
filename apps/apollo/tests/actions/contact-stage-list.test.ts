import { assertEquals } from "@std/assert";
import contactStageList from "../../actions/contact-stage-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-stage-list: GETs /contact_stages", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_stages: [{ id: "s1", name: "New" }] } }]);
  const out = await contactStageList.execute({}, ctx) as { contact_stages: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/contact_stages");
  assertEquals(out.contact_stages.length, 1);
});
