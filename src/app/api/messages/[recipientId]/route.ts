import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/messages/[recipientId] — get full conversation thread with a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientId } = await params;
    const userId = session.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
        gigId: null,
        projectId: null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages from the other user as read
    await prisma.message.updateMany({
      where: {
        senderId: recipientId,
        recipientId: userId,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
