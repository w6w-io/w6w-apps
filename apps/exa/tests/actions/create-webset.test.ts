import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-webset.ts";

Deno.test("create-webset: POSTs /v0/websets nesting the query under search", async () => {
  const body = { id: "ws_1", status: "running", dashboardUrl: "https://dashboard.exa.ai/w/ws_1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { query: "Marketing agencies focused on consumer products." },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/websets");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.search.query, "Marketing agencies focused on consumer products.");
  assertEquals(sent.search.entity, undefined);
  assertEquals(result, body);
});

Deno.test("create-webset: forwards title, count, entity, externalId and metadata", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ws_1", status: "running" } }]);
  await action.execute!(
    {
      query: "AI startups in Europe",
      title: "EU AI startups",
      count: 25,
      entity: "company",
      externalId: "my-ref-1",
      metadata: { team: "growth" },
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.title, "EU AI startups");
  assertEquals(sent.search.count, 25);
  assertEquals(sent.search.entity, { type: "company" });
  assertEquals(sent.externalId, "my-ref-1");
  assertEquals(sent.metadata, { team: "growth" });
});
