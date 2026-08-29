import { assertEquals } from "@std/assert";
import channelCreate from "../../actions/channel-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-create: POSTs mapped fields to /v2/channels", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "ch1", tag: "elonmusknews" } }]);
  const out = await channelCreate.execute(
    { tag: "elonmusknews", name: "Elon Musk News", subscribe: true },
    ctx,
  ) as { tag: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/channels");
  assertEquals(JSON.parse(calls[0].body!), {
    tag: "elonmusknews",
    name: "Elon Musk News",
    subscribe: true,
  });
  assertEquals(out.tag, "elonmusknews");
});

Deno.test("channel-create: parses feedFilters from a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "ch2" } }]);
  await channelCreate.execute(
    { tag: "x", feedFilters: '[{"field":"title","operator":"contains","value":"cats"}]' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.feed_filters, [{ field: "title", operator: "contains", value: "cats" }]);
});

Deno.test("channel-create: is declared non-idempotent — reusing an existing tag is undocumented", () => {
  assertEquals(channelCreate.idempotent, false);
});
