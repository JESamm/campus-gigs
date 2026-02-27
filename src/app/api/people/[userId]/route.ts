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
          skillsNeeded: true,
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

  // Remap field names to match what the client page expects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any;
  return NextResponse.json({
    user: {
      id: u.id,
      name: u.name,
      bio: u.bio,
      avatar: u.avatar,
      skills: u.skills,
      university: u.university,
      major: u.major,
      yearsOfStudy: u.yearsOfStudy,
      githubUrl: u.githubUrl,
      websiteUrl: u.websiteUrl,
      linkedinUrl: u.linkedinUrl,
      twitterUrl: u.twitterUrl,
      createdAt: u.createdAt,
      gigs: u.postedGigs,
      projects: u.createdProjects.map((p: any) => ({ ...p, skills: p.skillsNeeded })),
      _count: {
        postedGigs: u._count.postedGigs,
        createdProjects: u._count.createdProjects,
        applications: u._count.gigApplications,
      },
    },
  });
}
