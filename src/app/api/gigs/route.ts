import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createGigSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string(),
  skillsNeeded: z.array(z.string()).optional(),
  budget: z.number().positive("Budget must be a positive number"),
  duration: z.string(),
  deadline: z.string().datetime().optional(),
  attachments: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "open";
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");

    const where = { ...(category && { category }), status };

    const [gigs, total] = await Promise.all([
      prisma.gig.findMany({
        where,
        include: {
          poster: { select: { id: true, name: true, avatar: true, university: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.gig.count({ where }),
    ]);

    const parsed = gigs.map((g) => ({
      ...g,
      skillsNeeded: JSON.parse(g.skillsNeeded || "[]"),
      attachments: JSON.parse(g.attachments || "[]"),
    }));

    return NextResponse.json({ gigs: parsed, total, skip, take });
  } catch (error) {
    console.error("Error fetching gigs:", error);
    return NextResponse.json({ error: "Failed to fetch gigs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, skillsNeeded, budget, duration, deadline, attachments } =
      createGigSchema.parse(body);

    const gig = await prisma.gig.create({
      data: {
        title,
        description,
        category,
        skillsNeeded: JSON.stringify(skillsNeeded || []),
        budget,
        duration,
        deadline: deadline ? new Date(deadline) : null,
        attachments: JSON.stringify(attachments || []),
        posterId: session.user.id,
      },
      include: { poster: { select: { id: true, name: true, avatar: true } } },
    });

    return NextResponse.json(
      { ...gig, skillsNeeded: JSON.parse(gig.skillsNeeded), attachments: JSON.parse(gig.attachments) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: messages }, { status: 400 });
    }
    console.error("Error creating gig:", error);
    return NextResponse.json({ error: "Failed to create gig" }, { status: 500 });
  }
}