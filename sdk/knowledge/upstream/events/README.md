<!--
@derived-from CAKE-com/pumble-node-sdk
@upstream-path docs/basic-concepts.md (paraphrased)
@license ISC
Copyright (c) CAKE.com Inc. and CAKE-com/pumble-node-sdk contributors.
See THIRD_PARTY_NOTICES.md.
-->

# Pumble event payloads (upstream)

These types are lifted from
[`CAKE-com/pumble-node-sdk`](https://github.com/CAKE-com/pumble-node-sdk)
(ISC). They describe the **Pumble OAuth-app event payload** shape — messages,
reactions, channels, app lifecycle, and workspace events.

## Boundary

- These payloads describe the **OAuth-app** event surface that CAKE.com's
  official `pumble-sdk` handles. This SDK targets the
  **Pumble API-Keys add-on**, which does not directly emit these webhook events.
- They are bundled here as a knowledge resource for agents that need to
  understand Pumble's canonical event shape — for example, to consume
  webhooks produced by a separate OAuth-installed Pumble app, or to reason
  about a payload pasted into chat by an operator.
- Field names use Pumble's short-form convention:
  - `aId` — author id
  - `cId` — channel id
  - `tx` — message text
  - `mId` — message id
  - `eph` — is-ephemeral
  - `ty` — event type discriminator
  - `wId` — workspace id

  See the `NotificationMessage` and `NotificationReaction` shapes in
  `index.ts` for the rest of the abbreviations.

## Updating

The TypeScript file in this directory is regenerated from a local clone of
`CAKE-com/pumble-node-sdk`. Run:

```sh
git clone https://github.com/CAKE-com/pumble-node-sdk \
  officialsdk/pumble-node-sdk
cd sdk
node scripts/refresh-knowledge.mjs
node scripts/attribution-audit.mjs
```

The refresh script is idempotent and only updates `events/index.ts` and
`blocks/types.ts`. Diff the result against the previous commit to spot
upstream drift before landing the update.
