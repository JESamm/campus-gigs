import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function canAccess(projectId: string, userId: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });
  if (!project) return { project: null, canRead: false, canWrite: false };
  const isOwner = project.createdById === userId;
  const isMember = project.members.some((m) => m.userId === userId);
  const canRead = project.visibility === "public" || isOwner || isMember;
  const canWrite = !!userId && (isOwner || isMember || project.visibility === "public");
  return { project, canRead, canWrite };
}

// GET /api/projects/[id]/discussions
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const { project, canRead } = await canAccess(id, session?.user?.id ?? null);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canRead) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const discussions = await prisma.projectDiscussion.findMany({
    where: { projectId: id },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      replies: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ discussions });
}

// POST /api/projects/[id]/discussions
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project, canWrite } = await canAccess(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canWrite) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim())
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });

  const discussion = await prisma.projectDiscussion.create({
    data: { title: title.trim(), body: body.trim(), projectId: id, authorId: session.user.id },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      _count: { select: { replies: true } },
    },
  });
  return NextResponse.json({ discussion }, { status: 201 });
}
