import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; fileId: string }> };

// DELETE /api/projects/[id]/files/[fileId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, fileId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    include: { project: { select: { createdById: true } } },
  });
  if (!file || file.projectId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = file.project.createdById === session.user.id;
  const isUploader = file.uploadedById === session.user.id;
  if (!isOwner && !isUploader) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.projectFile.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
