import { assertEquals } from "@std/assert";
import sessionCreate from "../../actions/session-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("session-create: POSTs configuration and returns the session", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ id: "s1", status: "initializing" }),
  }]);
  const out = await sessionCreate.execute(
    { profileName: "my-profile", record: true, timeoutMinutes: 30 },
    ctx,
  ) as { id: string; status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions");
  assertEquals(JSON.parse(calls[0].body!), {
    configuration: { profileName: "my-profile", record: true, timeoutMinutes: 30 },
  });
  assertEquals(out.id, "s1");
});

Deno.test("session-create: extensionIds is split from a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "s1" }) }]);
  await sessionCreate.execute({ extensionIds: "ext1, ext2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.configuration.extensionIds, ["ext1", "ext2"]);
});

Deno.test("session-create: is declared non-idempotent — every call starts a new billed session", () => {
  assertEquals(sessionCreate.idempotent, false);
});
