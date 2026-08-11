import { assert, assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { WEBHOOK_SCOPES } from "../../lib/webhook-scopes.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-create: posts url, scopes, token and enabled at the top level", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "42", url: "https://a/hook", scopes: ["photo.created"], token: "s3cret" },
  }]);
  const webhook = await webhookCreate.execute({
    url: "https://a/hook",
    scopes: ["photo.created", "photo.tag_added"],
    token: "s3cret",
    enabled: true,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/webhooks");
  assertEquals(bodyOf(calls[0]), {
    url: "https://a/hook",
    scopes: ["photo.created", "photo.tag_added"],
    token: "s3cret",
    enabled: true,
  });
  // The token the caller supplied is not echoed back into the run record.
  assert(!JSON.stringify(webhook).includes("s3cret"), "the signing token came back");
});

Deno.test("webhook-create: refuses an empty scope list", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookCreate.execute({ url: "https://a", scopes: [] }, ctx),
    Error,
    "At least one event scope",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: offers exactly the vendor's scope vocabulary", () => {
  const scopes = webhookCreate.params!.find((p) => p.key === "scopes")!;
  assertEquals(
    (scopes.options as Array<{ value: string }>).map((o) => String(o.value)),
    WEBHOOK_SCOPES,
  );
  const token = webhookCreate.params!.find((p) => p.key === "token")!;
  assertEquals(token.type, "secret");
  assertEquals(webhookCreate.idempotent, false);
});
