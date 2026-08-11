import { assert, assertEquals } from "@std/assert";
import backupCreate from "../../actions/backup-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * A `GET` with side effects, on the SINGULAR path. The one-letter difference
 * from `/backups` is the difference between reading a list and queueing a job
 * that emails the account owner.
 */
Deno.test("backup-create: GETs the singular path", async () => {
  const { ctx, calls } = mockCtx([{
    body: "We will send you email with html export file when it be ready!",
    headers: {},
  }]);
  const out = await backupCreate.execute({}, ctx) as { message: string };

  assertEquals(pathOf(calls[0].url), "/rest/v1/backup");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.message, "We will send you email with html export file when it be ready!");
});

/**
 * The documented response is a sentence, not JSON. The client's non-JSON
 * fallback is what keeps that from being a parse error, and a response that
 * carries no text at all still has to produce something readable.
 */
Deno.test("backup-create: an empty response still yields a message", async () => {
  const { ctx } = mockCtx([{ body: "" }]);
  const out = await backupCreate.execute({}, ctx) as { message: string };
  assert(out.message.length > 0, "no fallback message");
});

/** Typed by what it does, not by the verb the vendor chose. */
Deno.test("backup-create: is a non-idempotent perform despite being a GET", () => {
  assertEquals(backupCreate.type, "perform");
  assertEquals(backupCreate.idempotent, false);
});
