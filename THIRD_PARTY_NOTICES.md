# Third-Party Notices

This product includes selectively lifted code and documentation from the
following upstream projects. Each file in our tree that contains
upstream-derived content carries an attribution header.

## CAKE-com/pumble-node-sdk

- **License:** ISC
- **Copyright:** Copyright (c) CAKE.com Inc. and CAKE-com/pumble-node-sdk contributors.
- **Upstream:** https://github.com/CAKE-com/pumble-node-sdk
- **npm:** https://www.npmjs.com/package/pumble-sdk

### Files derived from this project

| Path | Upstream source | Notes |
| --- | --- | --- |
| `sdk/knowledge/upstream/events/index.ts` | `pumble-sdk/src/core/types/pumble-events.ts` | Typed Pumble event payloads (NotificationXxx) and EventMap. Header + body lifted verbatim via `scripts/refresh-knowledge.mjs`. |
| `sdk/knowledge/upstream/events/README.md` | `docs/basic-concepts.md` (paraphrased) | Field-name glossary and boundary statement explaining that these payloads describe the OAuth-app event surface, not the API-Keys add-on. |
| `sdk/knowledge/upstream/blocks/types.ts` | `pumble-sdk/src/api/v1/types.ts` | Selective slice of the V1 namespace (block / element / view / request types). Runtime declarations are stripped at lift time; see `scripts/refresh-knowledge.mjs#liftBlocks`. |

---

ISC License text reproduced below per its terms.

```
ISC License

Copyright (c) CAKE.com Inc. and CAKE-com/pumble-node-sdk contributors.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
