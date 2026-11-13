import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

let n = 0;
/** Registers a fresh user and returns a cookie-carrying agent. */
export async function loggedAgent(name = "Ana") {
  const agent = request.agent(app);
  const email = `user${++n}-${Date.now()}@test.dev`;
  const res = await agent.post("/api/auth/register").send({ name, email, password: "secret123" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body as { id: string; email: string } };
}
