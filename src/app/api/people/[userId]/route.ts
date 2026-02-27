import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

// GET /api/people/[userId] — public profile
export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      avatar: true,
      skills: true,
      university: true,
      major: true,
      yearsOfStudy: true,
      githubUrl: true,
      websiteUrl: true,
      linkedinUrl: true,
      twitterUrl: true,
      createdAt: true,
      postedGigs: {
        where: { status: "open" },
        select: { id: true, title: true, category: true, budget: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      createdProjects: {
        where: { visibility: "public" },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          visibility: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          postedGigs: true,
          createdProjects: true,
          gigApplications: true,
          projectMemberships: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}
