# pumble-sdk examples

Small examples for the published `pumble-sdk` package.

## Prerequisites

- Node.js 20 or newer
- npm
- A Pumble API key in `PUMBLE_API_KEY` for live examples

## Setup

1. Copy `.env.template` to `.env`.

   ```bash
   cp .env.template .env
   ```

2. Put your API key in `.env`.

## Running the Examples

Build the parent SDK once, then run an example:

```bash
npm run build
npx tsx list-channels.ts
```

## Testing Fixtures Example

`testing-fixtures.ts` runs entirely against in-memory fixture data. It shows how
to configure `createPumbleClient` with `createMockPumbleFetch`, so it does not
need `PUMBLE_API_KEY` or live Pumble access.

From the SDK root:

```bash
npm run test:examples
```
