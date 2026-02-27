import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(1000).optional(),
  university: z.string().optional(),
  major: z.string().optional(),
  yearsOfStudy: z.string().optional(),
  skills: z.array(z.string()).optional(),
  avatar: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
});

// GET /api/user/profile — current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
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
            gigApplications: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        skills: JSON.parse(user.skills || "[]") as string[],
        _count: {
          postedGigs: user._count.postedGigs,
          createdProjects: user._count.createdProjects,
          applications: user._count.gigApplications,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/user/profile — update profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.university !== undefined && { university: data.university }),
        ...(data.major !== undefined && { major: data.major }),
        ...(data.yearsOfStudy !== undefined && { yearsOfStudy: data.yearsOfStudy }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.skills !== undefined && { skills: JSON.stringify(data.skills) }),
        ...(data.githubUrl !== undefined && { githubUrl: data.githubUrl || null }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
        ...(data.twitterUrl !== undefined && { twitterUrl: data.twitterUrl || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
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
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        skills: JSON.parse(updated.skills || "[]") as string[],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
