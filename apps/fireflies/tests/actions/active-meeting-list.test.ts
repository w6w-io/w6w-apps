import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/active-meeting-list.ts";

const OK = { data: { active_meetings: [{ id: "m1", state: "active" }] } };

Deno.test("active-meeting-list: wraps its filters in the input object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ email: "a@b.com" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("active_meetings(input: { email: $email, states: $states })"));
  assertEquals(variables, { email: "a@b.com" });
});

Deno.test("active-meeting-list: declares states as [MeetingState!], the safer of the two spellings", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({}, ctx);
  // A non-null-item list variable is accepted where a nullable-item list is
  // expected; the reverse is a validation error. The vendor's own example uses
  // this form while its argument table says [MeetingState].
  assert(sent(calls[0]).query.includes("$states: [MeetingState!]"));
});

Deno.test("active-meeting-list: accepts states as an array or as a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }, { body: OK }]);
  await action.execute({ states: ["active", "paused"] as unknown as string }, ctx);
  assertEquals(sent(calls[0]).variables.states, ["active", "paused"]);
  await action.execute({ states: "active, paused" }, ctx);
  assertEquals(sent(calls[1]).variables.states, ["active", "paused"]);
});
