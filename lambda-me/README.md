# lambda-me

Single Lambda handling **user preferences** and **saved calculator presets** for
the engine-build site. Mirrors the pattern used by `lambda-directory/`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET    | `/api/me/preferences`            | Returns the signed-in user's prefs, or defaults |
| PUT    | `/api/me/preferences`            | Partial upsert of pref fields |
| GET    | `/api/me/presets?calcSlug=xxx`   | List presets (filter by calc slug if given) |
| POST   | `/api/me/presets`                | Create a new preset |
| PUT    | `/api/me/presets/:id`            | Update name and/or state |
| DELETE | `/api/me/presets/:id`            | Delete a preset |

Backed by the `user_preferences` and `user_calc_presets` Postgres tables
(see `engine-db/init/10_user_preferences.sql` and
`engine-db/init/11_user_calc_presets.sql`). Those migrations have already
been run in Supabase.

## Required environment variables

Same as `lambda-directory`. Set on the Lambda configuration:

```
RDS_HOST=<supabase host>
RDS_PORT=5432
RDS_DB=postgres
RDS_USER=<supabase user>
RDS_PASSWORD=<supabase password>
```

Reuse whatever Lambda role / VPC / security group `lambda-directory` already
has — same Postgres backend.

## Auth model

JWT decoded from `Authorization: Bearer <token>` without signature verification
(same trust model as `lambda-directory`). HTTPS termination at API Gateway is
the perimeter. If verified JWTs are needed later, attach the same API Gateway
JWT authorizer used by `lambda-builds`.

## Deploying

```sh
cd lambda-me
npm install
zip -r function.zip index.mjs package.json node_modules
# upload function.zip to the Lambda via Console or:
# aws lambda update-function-code --function-name engine-build-me \
#     --zip-file fileb://function.zip
```

Runtime: **Node.js 20.x** (matches the existing Lambdas).
Handler: `index.handler`.

## API Gateway routes to add

Pointing at this Lambda (HTTP API integration):

```
ANY /api/me/preferences
ANY /api/me/presets
ANY /api/me/presets/{id}
```

`ANY` covers GET/PUT/POST/DELETE/OPTIONS. The handler does its own CORS
preflight on OPTIONS, so no separate CORS configuration is needed at the
gateway level.

## Notes

- The handler returns a fully-shaped prefs object even for guest users (no
  401 on GET). The frontend hook treats unsigned users as having
  `userId: "guest"` and falls back to localStorage.
- `MAX_PRESETS_PER_CALC = 50` (per-user, per-calc). Adjust at the top of
  `index.mjs` if needed.
- The frontend already points at the API Gateway URL hardcoded in
  `artifacts/engine-build/src/lib/authFetch.ts` — no frontend change needed
  once the routes are live.
