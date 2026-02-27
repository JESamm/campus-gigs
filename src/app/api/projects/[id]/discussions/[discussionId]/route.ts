import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; discussionId: string }> };

// POST /api/projects/[id]/discussions/[discussionId]/replies
export async function POST(req: NextRequest, { params }: Params) {
  const { id, discussionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const discussion = await prisma.projectDiscussion.findUnique({
    where: { id: discussionId },
    include: {
      project: { include: { members: { select: { userId: true } } } },
    },
  });
  if (!discussion || discussion.projectId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (discussion.closed) return NextResponse.json({ error: "Discussion is closed" }, { status: 400 });

  const proj = discussion.project;
  const isOwner = proj.createdById === session.user.id;
  const isMember = proj.members.some((m: { userId: string }) => m.userId === session.user.id);
  const isPublic = proj.visibility === "public";
  if (!isOwner && !isMember && !isPublic)
    return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Reply body is required" }, { status: 400 });

  const reply = await prisma.discussionReply.create({
    data: { body: body.trim(), discussionId, authorId: session.user.id },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json({ reply }, { status: 201 });
}

// PATCH /api/projects/[id]/discussions/[discussionId] — pin or close (owner only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, discussionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const discussion = await prisma.projectDiscussion.findUnique({
    where: { id: discussionId },
    include: { project: { select: { createdById: true } } },
  });
  if (!discussion || discussion.projectId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    discussion.project.createdById !== session.user.id &&
    discussion.authorId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.projectDiscussion.update({
    where: { id: discussionId },
    data: {
      ...(body.pinned !== undefined && { pinned: Boolean(body.pinned) }),
      ...(body.closed !== undefined && { closed: Boolean(body.closed) }),
    },
  });
  return NextResponse.json({ discussion: updated });
}

// DELETE /api/projects/[id]/discussions/[discussionId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, discussionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const discussion = await prisma.projectDiscussion.findUnique({
    where: { id: discussionId },
    include: { project: { select: { createdById: true } } },
  });
  if (!discussion || discussion.projectId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isProjectOwner = discussion.project.createdById === session.user.id;
  const isAuthor = discussion.authorId === session.user.id;
  if (!isProjectOwner && !isAuthor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.projectDiscussion.delete({ where: { id: discussionId } });
  return NextResponse.json({ success: true });
}
