# Kadris HR

Milestone 1 foundation for Kadris Support Services' HR onboarding and compliance workflow.

## Local setup

1. Copy `.env.example` to `.env` and set a PostgreSQL connection string.
2. Run `npm install`.
3. Run `npm run db:generate`.
4. Apply the migration with `pnpm db:migrate`.
5. Seed development data with `pnpm db:seed`.
6. Run `pnpm test`, `pnpm run typecheck`, and `pnpm run lint`.

## Domain decisions

- Employee lifecycle and clearance are separate. `clearanceStatus` is a derived projection and may only be updated after evaluating employee requirements.
- Role mappings are configurable; employee assignments snapshot clearance-relevant settings so later configuration edits do not silently rewrite historical decisions.
- Conditional assignments only affect clearance when `conditionSatisfied` is true.
- The clearance calculation fails closed if a role has no applicable pre-work requirements.
- Credentials remain valid through their expiration date. Expiration is derived from dates, even when a persisted status has not yet been refreshed.
- Documents store private-provider object keys, never public URLs. Access must later be mediated by authorization checks and short-lived signed URLs.
- Authentication users store an external provider ID; no password data is stored by this application.
