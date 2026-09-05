import { assertEquals } from "@std/assert";
import contactListChannels from "../../actions/contact-list-channels.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list-channels: GETs /contact/{identifier}/channels with pagination query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, source: "whatsapp" }]) }]);
  const out = await contactListChannels.execute(
    { identifier: "id:1", limit: 20 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/channels");
  assertEquals(queryOf(calls[0].url), { limit: "20" });
  assertEquals(out.items.length, 1);
});

Deno.test("contact-list-channels: is a read action", () => {
  assertEquals(contactListChannels.type, "read");
});
