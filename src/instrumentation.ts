export async function register() {
  // Firestore is schemaless — nothing to migrate on boot. (The old
  // Postgres/Prisma version of this hook auto-applied pending SQL migrations
  // here; see git history / docs/ARCHITECTURE.md if that's ever needed again.)
}
