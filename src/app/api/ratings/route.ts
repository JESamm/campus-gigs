import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ratingSchema = z.object({
  gigId: z.string(),
  revieweeId: z.string(),
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// POST /api/ratings — leave a rating after a gig
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gigId, revieweeId, score, comment } = ratingSchema.parse(body);

    if (revieweeId === session.user.id) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }

    // Check gig exists and reviewer is either the poster or an accepted applicant
    const gig = await prisma.gig.findUnique({
      where: { id: gigId },
      include: { applications: { where: { status: "accepted" } } },
    });
    if (!gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });

    const isPoster = gig.posterId === session.user.id;
    const isAcceptedApplicant = gig.applications.some(a => a.applicantId === session.user.id);

    if (!isPoster && !isAcceptedApplicant) {
      return NextResponse.json({ error: "Only the gig poster or accepted freelancer can leave ratings" }, { status: 403 });
    }

    // Check existing rating
    const existing = await prisma.rating.findUnique({
      where: { gigId_reviewerId_revieweeId: { gigId, reviewerId: session.user.id, revieweeId } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already rated this person for this gig" }, { status: 400 });
    }

    const rating = await prisma.rating.create({
      data: { gigId, reviewerId: session.user.id, revieweeId, score, comment },
    });

    // Notify the reviewee
    await prisma.notification.create({
      data: {
        userId: revieweeId,
        gigId,
        type: "rating_received",
        title: "New Rating",
        message: `${session.user.name} rated you ${score}/5 stars for "${gig.title}"`,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }
    console.error("POST /api/ratings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/ratings?userId=xxx — get average rating and reviews for a user
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    const ratings = await prisma.rating.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: { id: true, name: true } },
        gig: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const count = ratings.length;
    const average = count ? ratings.reduce((sum, r) => sum + r.score, 0) / count : 0;

    return NextResponse.json({ ratings, count, average: Math.round(average * 10) / 10 });
  } catch (error) {
    console.error("GET /api/ratings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
