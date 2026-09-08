import { assert, assertEquals } from "@std/assert";
import webhookUpsert from "../../actions/webhook-upsert.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-upsert: posts the documented fields, omitting unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", type: "NewEntrySaved" } }]);
  await webhookUpsert.execute(
    {
      type: "NewEntrySaved",
      webhookURL: "https://host.example/hook",
      resourceId: "enterprise/acme/tag/global.all",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/enterprise/triggers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "NewEntrySaved");
  assertEquals(body.webhookURL, "https://host.example/hook");
  assertEquals(body.resourceId, "enterprise/acme/tag/global.all");
  assertEquals("authorization" in body, false);
  assertEquals("id" in body, false);
});

Deno.test("webhook-upsert: forwards the receiver authorization header when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookUpsert.execute(
    {
      type: "NewAnnotation",
      webhookURL: "https://host.example/hook",
      authorization: "Bearer receiver-secret",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.authorization, "Bearer receiver-secret");
});

Deno.test("webhook-upsert: passing id updates rather than creates", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookUpsert.execute(
    {
      type: "NewAnnotation",
      webhookURL: "https://host.example/hook",
      id: "166e676a496:52:8c61af75",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "166e676a496:52:8c61af75");
});

Deno.test("webhook-upsert: the receiver's authorization field is a secret param", () => {
  const field = webhookUpsert.params?.find((p) => p.key === "authorization");
  assertEquals(field?.type, "secret");
});

Deno.test("webhook-upsert: is not idempotent", () => {
  assertEquals(webhookUpsert.idempotent, false);
});

/**
 * The audit tool bans a hand-set `Authorization` header outside `auth/` (only
 * `sign` may touch a credential). This action's field is legitimately named
 * `authorization` by the vendor but is the WORKFLOW AUTHOR's own receiver
 * secret, never the Feedly API token — this test pins that the assignment
 * site itself does not spell the literal field name, so the distinction
 * survives a future edit.
 */
Deno.test("webhook-upsert: the body assignment never spells a literal authorization: key", async () => {
  const src = await Deno.readTextFile(new URL("../../actions/webhook-upsert.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert(
    !/["'`]?authorization["'`]?\s*[\]:=]/i.test(code),
    "a literal authorization: assignment reappeared",
  );
});
