# Security policy

## Supported versions

Only the `main` branch receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Email
**satvikpraveen707@gmail.com** with a description, reproduction steps and the
commit you tested against. You will get an acknowledgement within 72 hours and
a fix or a mitigation plan within 14 days for confirmed issues.

## Security design notes

- Access tokens are short-lived JWTs (15 min by default); refresh tokens are
  rotated atomically on use, so a replayed refresh token is rejected, and
  can be revoked per session or globally.
- Passwords are hashed with bcrypt (cost 12). Changing a password revokes
  every session.
- All request bodies and query strings are validated with Zod before any
  database access. Regular-expression inputs for search are escaped.
- Rate limits apply globally, more strictly on authentication, and on uploads.
- Uploaded object keys are namespaced by owner and ownership is enforced
  structurally on delete. Uploaded objects are no longer requested as
  public-read; visibility is the bucket policy's decision.
- Authorization headers, cookies, passwords and refresh tokens are redacted
  from logs.
- Dependencies are monitored by Dependabot and the code by CodeQL on every
  push.
