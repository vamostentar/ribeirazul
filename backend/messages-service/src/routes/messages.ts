import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { sendContactEmail } from '@/services/mailer.js';

const createMessageSchema = z.object({
  fromName: z.string().min(2),
  fromEmail: z.string().email(),
  phone: z.string().optional(),
  body: z.string().min(5),
  context: z.any().optional(),
});

export async function registerMessageRoutes(app: FastifyInstance) {
  const prisma = new PrismaClient();

  app.post('/api/v1/messages', async (request, reply) => {
    const parsed = createMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'INVALID_BODY', details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const msg = await prisma.message.create({
      data: {
        fromName: data.fromName,
        fromEmail: data.fromEmail,
        phone: data.phone,
        body: data.body,
        context: data.context ?? undefined,
        status: 'QUEUED',
        events: { create: { type: 'OUTBOUND_QUEUED' } }
      }
    });

    try {
      await sendContactEmail(data);
      await prisma.message.update({ where: { id: msg.id }, data: { status: 'SENT', events: { create: { type: 'OUTBOUND_SENT' } } } });
      return reply.code(201).send({ success: true, data: { id: msg.id, status: 'SENT' } });
    } catch (e: any) {
      await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED', error: String(e?.message || e), retries: { increment: 1 }, events: { create: { type: 'OUTBOUND_FAILED', details: { error: String(e?.message || e) } } } } });
      return reply.code(500).send({ success: false, error: 'SEND_FAILED' });
    }
  });

  app.get('/api/v1/messages/:id', async (request, reply) => {
    const id = (request.params as any).id as string;
    const message = await prisma.message.findUnique({ where: { id }, include: { events: true } });
    if (!message) return reply.code(404).send({ success: false, error: 'NOT_FOUND' });
    return reply.send({ success: true, data: message });
  });

  app.get('/api/v1/messages', async (_request, reply) => {
    const list = await prisma.message.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return reply.send({ success: true, data: list });
  });
}


