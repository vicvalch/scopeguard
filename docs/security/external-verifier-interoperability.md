# External verifier interoperability

External verifiers can fetch issuer metadata and key metadata, then verify Ed25519 claims offline.

Flow:
1. GET issuer metadata.
2. GET issuer keys.
3. Verify claim signature locally with Ed25519 public key.
4. Apply local trust-domain policy.

HMAC claims still require PMFreak-mediated verification.
This phase is not public federation/DID/blockchain/AOC Protocol.
