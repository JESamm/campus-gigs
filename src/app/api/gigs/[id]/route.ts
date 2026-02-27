import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const gig = await prisma.gig.findUnique({
      where: { id },
      include: {
        poster: { select: { id: true, name: true, university: true, major: true, bio: true } },
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                name: true,
                university: true,
                avatar: true,
                skills: true,
                reviewsReceived: {
                  select: { score: true },
                },
              },
            },
          },
          orderBy: { appliedAt: "desc" },
        },
        _count: { select: { applications: true } },
      },
    });

    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });

    // Compute average rating for each applicant
    const gigWithRatings = {
      ...gig,
      skillsNeeded: JSON.parse(gig.skillsNeeded || "[]"),
      attachments: JSON.parse(gig.attachments || "[]"),
      applications: gig.applications.map((app) => {
        const reviews = app.applicant.reviewsReceived;
        const ratingCount = reviews.length;
        const ratingAvg = ratingCount
          ? Math.round((reviews.reduce((s, r) => s + r.score, 0) / ratingCount) * 10) / 10
          : 0;
        return {
          ...app,
          applicant: {
            ...app.applicant,
            skills: JSON.parse(app.applicant.skills || "[]"),
            ratingAvg,
            ratingCount,
            reviewsReceived: undefined,
          },
        };
      }),
    };

    return NextResponse.json({ gig: gigWithRatings });
  } catch (err) {
    console.error("GET /api/gigs/[id]:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const gig = await prisma.gig.findUnique({ where: { id } });
  if (!gig) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (gig.posterId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.gig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
