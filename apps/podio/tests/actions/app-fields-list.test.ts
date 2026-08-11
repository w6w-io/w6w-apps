import { assert, assertEquals } from "@std/assert";
import appFieldsList from "../../actions/app-fields-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const APP = {
  app_id: 123,
  token: "the-app-token",
  config: { name: "Leads" },
  fields: [
    {
      field_id: 1,
      type: "text",
      external_id: "title",
      config: { label: "Title", required: true, settings: { size: "small" } },
    },
    {
      field_id: 2,
      type: "category",
      external_id: "status",
      config: {
        label: "Status",
        settings: { options: [{ id: 11, text: "Open" }] },
      },
    },
  ],
};

Deno.test("app-fields-list: reads the app definition and returns only the schema", async () => {
  const { ctx, calls } = mockCtx([{ body: APP }]);
  const out = await appFieldsList.execute({ appId: "123" }, ctx) as {
    fields: Array<Record<string, unknown>>;
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/app/123");
  assertEquals(out.count, 2);
  assertEquals(out.fields[0].externalId, "title");
  assertEquals(out.fields[0].required, true);
  assertEquals(out.fields[1].externalId, "status");
});

Deno.test("app-fields-list: the app token cannot reach the result", async () => {
  const { ctx } = mockCtx([{ body: APP }]);
  const out = await appFieldsList.execute({ appId: "123" }, ctx);
  assert(!JSON.stringify(out).includes("the-app-token"), "the app token leaked through the schema");
});

Deno.test("app-fields-list: category options come through, because a value is the option id", async () => {
  const { ctx } = mockCtx([{ body: APP }]);
  const out = await appFieldsList.execute({ appId: "123" }, ctx) as {
    fields: Array<Record<string, unknown>>;
  };
  assertEquals(out.fields[1].options, [{ id: 11, text: "Open" }]);
  assert(String(out.fields[1].valueShape).includes("option id"));
});

Deno.test("app-fields-list: an app with no fields reports zero rather than throwing", async () => {
  const { ctx } = mockCtx([{ body: { app_id: 1 } }]);
  assertEquals(await appFieldsList.execute({ appId: "1" }, ctx), { fields: [], count: 0 });
});
