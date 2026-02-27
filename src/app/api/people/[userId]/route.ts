import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

// GET /api/people/[userId] — public profile (respects privacy setting)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id;
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
      profileVisibility: true,
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

  // Privacy gate: if profile is private, only allow:
  // 1. The user themselves  2. Team collaborators  3. Gig posters whose gig the user applied to
  if (user.profileVisibility === "private" && viewerId !== userId) {
    let allowed = false;

    if (viewerId) {
      // Check if viewer shares a project team with this user
      const sharedProject = await prisma.projectMember.findFirst({
        where: {
          userId: viewerId,
          project: { members: { some: { userId } } },
        },
      });
      if (sharedProject) allowed = true;

      // Check if viewer posted a gig this user applied to
      if (!allowed) {
        const gigConnection = await prisma.gigApplication.findFirst({
          where: {
            applicantId: userId,
            gig: { posterId: viewerId },
          },
        });
        if (gigConnection) allowed = true;
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { error: "private", message: "This profile is private." },
        { status: 403 }
      );
    }
  }

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
