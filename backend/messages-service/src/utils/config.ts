import { config as dotenv } from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'production') dotenv();

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(8090),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
  DATABASE_URL: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM: z.string().email(),
  IMAP_HOST: z.string().min(1),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_SECURE: z.coerce.boolean().default(true),
  IMAP_USER: z.string().min(1),
  IMAP_PASS: z.string().min(1),
});

export const config = schema.parse(process.env);


