import { assertEquals } from "@std/assert";
import whatsappTemplateList from "../../actions/whatsapp-template-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whatsapp-template-list: GET .../whatsapp/templates, {templates,complete}, not {data}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        templates: [{ id: "t1", name: "order_confirmation" }],
        complete: true,
        unavailableWabaIds: [],
      },
    },
  ]);
  const out = await whatsappTemplateList.execute({ agentId: "a1" }, ctx) as {
    templates: unknown[];
    complete: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/whatsapp/templates");
  assertEquals(out.templates.length, 1);
  assertEquals(out.complete, true);
});
