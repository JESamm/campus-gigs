import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/people?page=1&limit=20&search=&skill=
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search")?.trim() ?? "";
  const skill = searchParams.get("skill")?.trim() ?? "";

  // Build filter: only show public profiles (+ the logged-in user's own profile)
  const visibilityFilter: Record<string, unknown>[] = [
    { profileVisibility: "public" },
  ];
  if (session?.user?.id) {
    visibilityFilter.push({ id: session.user.id });
  }

  const where: Record<string, unknown> = {
    OR: visibilityFilter,
  };

  // Layer on search / skill filters using AND
  const andConditions: Record<string, unknown>[] = [];
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { university: { contains: search } },
        { major: { contains: search } },
      ],
    });
  }
  if (skill) {
    andConditions.push({ skills: { contains: skill } });
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        _count: {
          select: {
            postedGigs: true,
            createdProjects: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
}

