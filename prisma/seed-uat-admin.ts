import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../generated/prisma/client";

const email = process.env.UAT_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.UAT_ADMIN_NAME?.trim() || "UAT Owner Admin";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!email) throw new Error("UAT_ADMIN_EMAIL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

await prisma.user.upsert({
  where: { email },
  update: { name, role: UserRole.OWNER_ADMIN, active: true },
  create: {
    authProviderId: `pending:uat-admin:${email}`,
    email,
    name,
    role: UserRole.OWNER_ADMIN,
    active: true,
  },
});

console.log(`UAT owner/admin ready: ${email}`);
await prisma.$disconnect();
