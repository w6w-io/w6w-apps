import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import pipeList from "../../actions/pipe-list.ts";

Deno.test("pipe-list: lists an organization's pipes", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { organization: { pipes: [{ id: "1", name: "Sales" }] } } },
  }]);
  const out = await pipeList.execute({ organizationId: "12345" }, ctx) as { pipes: unknown[] };
  assertEquals(out.pipes.length, 1);
  const body = JSON.parse(calls[0].body!);
  const q = normalizeGql(body.query);
  assert(q.startsWith("{ organization(id: 12345) { pipes {"));
  assert(q.includes("uuid"));
  assert(q.includes("emailAddress"));
});

Deno.test("pipe-list: throws when the organization does not resolve", async () => {
  const { ctx } = mockCtx([{ body: { data: { organization: null } } }]);
  let threw = false;
  try {
    await pipeList.execute({ organizationId: "bad" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("pipe-list: type/resource metadata", () => {
  assertEquals(pipeList.type, "read");
  assertEquals(pipeList.resource, "pipe");
});
