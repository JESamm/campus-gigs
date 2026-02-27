import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/people?page=1&limit=20&search=&skill=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search")?.trim() ?? "";
  const skill = searchParams.get("skill")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { university: { contains: search } },
      { major: { contains: search } },
    ];
  }
  if (skill) {
    where.skills = { contains: skill };
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
