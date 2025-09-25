import { config } from '@/utils/config.js';
import { PrismaClient } from '@prisma/client';
import { ImapFlow } from 'imapflow';

export async function startImapWorker(prisma: PrismaClient) {
  const client = new ImapFlow({
    host: config.IMAP_HOST,
    port: config.IMAP_PORT,
    secure: config.IMAP_SECURE,
    auth: { user: config.IMAP_USER, pass: config.IMAP_PASS },
  });

  client.on('error', (err) => console.error('IMAP error:', err));

  await client.connect();
  const mailbox = await client.mailboxOpen('INBOX');
  console.log('📧 IMAP connected to', mailbox.path);

  // Simplified polling approach (more reliable than IDLE)
  setInterval(async () => {
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages = await client.search({ seen: false });
        if (messages && Array.isArray(messages)) {
          for (const uid of messages) {
            const msg = await client.fetchOne(uid, { envelope: true, bodyParts: ['text'] });
            if (msg && typeof msg === 'object' && 'envelope' in msg) {
              const from = msg.envelope?.from?.[0];
              const body = msg.bodyParts?.get('text') || '';
              await prisma.message.create({
                data: {
                  fromName: from?.name || 'Desconhecido',
                  fromEmail: from?.address || 'desconhecido@local',
                  body: String(body),
                  status: 'RECEIVED',
                  events: { create: { type: 'INBOUND_RECEIVED' } }
                }
              });
              await client.messageFlagsAdd(uid, ['\\Seen']);
            }
          }
        }
      } finally {
        lock.release();
      }
    } catch (e) {
      console.error('IMAP polling error:', e);
    }
  }, 30000); // Poll every 30 seconds
}


