# Experimental surfaces

These exist in the package but are not part of the stable contract.

## App helpers / OAuth

`pumble-keys-sdk/extensions/app/index.js` exposes building blocks for a Pumble app install flow, but does **not** yet provide:

- a complete OAuth install route handler
- a callback route helper that runs the token exchange
- refresh-token flow
- durable token storage adapters
- workspace selection
- bot vs user token disambiguation

Use the raw `PumbleSDK` directly for OAuth until the experimental flag is lifted.

## Socket Mode

`pumble-keys-sdk/extensions/app/socket-mode.js` requires an injected WebSocket implementation. There is no first-class reconnect/heartbeat policy bundled. Live tests are not part of the release gate.

## How to opt in

These exports remain available; importing them is the explicit opt-in. README and Quickstart do not reference them.
