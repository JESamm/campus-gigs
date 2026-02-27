import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const joinSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = joinSchema.parse(body);

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      (m) => m.userId === session.user.id
    );

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this project" },
        { status: 400 }
      );
    }

    // Check if project is full
    if (project.members.length >= project.maxMembers) {
      return NextResponse.json(
        { error: "Project is full" },
        { status: 400 }
      );
    }

    // Add user to project
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: session.user.id,
        role: "member",
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    // Create notification for project creator
    await prisma.notification.create({
      data: {
        userId: project.createdById,
        projectId,
        type: "project_invite",
        title: "New Member",
        message: `${session.user.name} joined your project: ${project.title}`,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Error joining project:", error);
    return NextResponse.json(
      { error: "Failed to join project" },
      { status: 500 }
    );
  }
}
