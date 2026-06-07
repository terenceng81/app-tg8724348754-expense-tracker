import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
})
