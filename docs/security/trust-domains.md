# Trust domains

Trust domains now support both legacy HMAC signing metadata and Ed25519 public verification metadata.

Asymmetric key metadata includes algorithm, key-use, status, validity windows, optional public PEM, and public JWK.
Private keys are loaded from env/secret references only and are never persisted in the database.

Independent verification validates signatures; authorization execution remains local governed-consumption logic.
