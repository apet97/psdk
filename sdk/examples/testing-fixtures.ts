import { fileURLToPath } from "node:url";
import { HTTPClient } from "../src/index.js";
import {
  createMockPumbleFetch,
  createPumbleClient,
} from "../src/extensions/index.js";

export type TestingFixturesExampleResult = {
  email: string;
  name: string;
  requestCount: number;
  userId: string;
  workspaceId: string;
};

const fixtureUser = {
  id: "000000000000000000000001",
  email: "user-1@example.invalid",
  name: "Fixture User",
  role: "MEMBER",
  status: "ACTIVATED",
  workspaceId: "000000000000000000000002",
};

export async function runTestingFixturesExample(): Promise<TestingFixturesExampleResult> {
  const fetch = createMockPumbleFetch([
    {
      request: { method: "GET", path: "/myInfo" },
      response: { body: fixtureUser },
    },
  ]);
  let requestCount = 0;
  const httpClient = new HTTPClient({
    fetcher: async (input, init) => {
      requestCount += 1;
      return fetch(input, init);
    },
  });
  const client = createPumbleClient({
    apiKeyAuth: "fixture-api-key",
    httpClient,
    serverURL: "https://pumble.example.invalid",
  });

  const me = await client.identity.me();
  return {
    email: me.email,
    name: me.name,
    requestCount,
    userId: me.id,
    workspaceId: me.workspaceId,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await runTestingFixturesExample();
  console.log(JSON.stringify(result, null, 2));
}
