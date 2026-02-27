import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Check if user can view this project (public or contributor/owner) */
async function canView(projectId: string, userId: string | null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });
  if (!project) return { project: null, allowed: false };
  if (project.visibility === "public") return { project, allowed: true };
  if (!userId) return { project, allowed: false };
  const isMember = project.members.some((m) => m.userId === userId);
  const isOwner = project.createdById === userId;
  return { project, allowed: isMember || isOwner };
}

// GET /api/projects/[id]/files
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const { project, allowed } = await canView(id, session?.user?.id ?? null);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const files = await prisma.projectFile.findMany({
    where: { projectId: id },
    include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
    orderBy: [{ path: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ files });
}

// POST /api/projects/[id]/files  — upload metadata after client uploads to /api/upload
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project, allowed } = await canView(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const body = await req.json();
  const { name, url, size = 0, mimeType = "application/octet-stream", path = "/" } = body;
  if (!name || !url) return NextResponse.json({ error: "name and url are required" }, { status: 400 });

  const file = await prisma.projectFile.create({
    data: {
      name,
      url,
      size: Number(size),
      mimeType,
      path,
      projectId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true, avatar: true } } },
  });
  return NextResponse.json({ file }, { status: 201 });
}
