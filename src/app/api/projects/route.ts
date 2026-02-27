import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string(),
  skillsNeeded: z.array(z.string()).optional(),
  maxMembers: z.number().int().positive().optional(),
  deadline: z.string().datetime().optional(),
  visibility: z.enum(["public", "private"]).optional().default("public"),
  readme: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "open";
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Public browsing only sees public projects; authenticated users also see their own private ones
    const visibilityFilter = userId
      ? { OR: [{ visibility: "public" }, { createdById: userId }, { members: { some: { userId } } }] }
      : { visibility: "public" };

    const where = {
      ...visibilityFilter,
      ...(category && { category }),
      status,
    } as Record<string, unknown>;

    const projects = await prisma.project.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, avatar: true, university: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const total = await prisma.project.count({ where });

    const parsed = projects.map((p) => ({
      ...p,
      skillsNeeded: JSON.parse(p.skillsNeeded || "[]"),
    }));

    return NextResponse.json({ projects: parsed, total, skip, take });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, skillsNeeded, maxMembers, deadline, visibility, readme } =
      createProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        title,
        description,
        category,
        skillsNeeded: JSON.stringify(skillsNeeded || []),
        maxMembers: maxMembers || 5,
        deadline: deadline ? new Date(deadline) : null,
        visibility: visibility ?? "public",
        readme: readme ?? null,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "creator",
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(
      { ...project, skillsNeeded: JSON.parse(project.skillsNeeded) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

