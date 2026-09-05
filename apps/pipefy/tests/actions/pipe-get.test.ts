import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import pipeGet from "../../actions/pipe-get.ts";

Deno.test("pipe-get: fetches a pipe with its phases, start-form fields and labels", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { pipe: { id: "1", name: "Sales", phases: [{ id: "10", name: "New" }] } } },
  }]);
  const out = await pipeGet.execute({ id: "1" }, ctx) as { name: string };
  assertEquals(out.name, "Sales");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ pipe(id: 1) {"));
  assert(q.includes("organization { id }"));
  assert(q.includes("phases { id name }"));
  assert(q.includes("start_form_fields { id label }"));
  assert(q.includes("labels { id name color }"));
});

Deno.test("pipe-get: type/resource metadata", () => {
  assertEquals(pipeGet.type, "read");
  assertEquals(pipeGet.resource, "pipe");
});
