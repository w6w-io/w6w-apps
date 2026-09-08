import { assertEquals } from "@std/assert";
import webhooksList from "../../actions/webhooks-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhooks-list: GETs /v3/enterprise/triggers", async () => {
  const body = [{
    id: "t1",
    type: "NewAnnotation",
    webhookURL: "https://host/hook",
    hasAuthorization: true,
  }];
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await webhooksList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/enterprise/triggers");
  assertEquals(out, { webhooks: body });
});

Deno.test("webhooks-list: never touches the configured authorization header value", async () => {
  const src = await Deno.readTextFile(new URL("../../actions/webhooks-list.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assertEquals(/authorization/i.test(code), false);
});
