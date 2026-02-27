import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  recipientId: z.string(),
  content: z.string().min(1).max(2000),
  gigId: z.string().optional(),
  projectId: z.string().optional(),
});

// GET /api/messages — list all conversations (unique partners) for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all direct messages where user is sender or recipient
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
        gigId: null,
        projectId: null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        recipient: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build a conversation map: one entry per unique partner
    const conversationMap = new Map<
      string,
      {
        partner: { id: string; name: string; avatar: string | null };
        lastMessage: { content: string; createdAt: Date; read: boolean };
        unread: number;
      }
    >();

    for (const msg of messages) {
      const partnerId = msg.senderId === userId ? msg.recipientId! : msg.senderId;
      const partner = msg.senderId === userId ? msg.recipient! : msg.sender;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partner,
          lastMessage: { content: msg.content, createdAt: msg.createdAt, read: msg.read },
          unread: !msg.read && msg.recipientId === userId ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(partnerId)!;
        if (!msg.read && msg.recipientId === userId) {
          existing.unread += 1;
        }
      }
    }

    const conversations = Array.from(conversationMap.entries()).map(([partnerId, data]) => ({
      partnerId,
      ...data,
    }));

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST /api/messages — send a direct message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, content, gigId, projectId } = messageSchema.parse(body);

    // Can't message yourself
    if (recipientId === session.user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: session.user.id,
        recipientId,
        gigId: gigId || null,
        projectId: projectId || null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        recipient: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "message",
        title: "New Message",
        message: `${session.user.name} sent you a message`,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
