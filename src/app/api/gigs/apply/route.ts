import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const applySchema = z.object({
  gigId: z.string(),
  coverLetter: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { gigId, coverLetter } = applySchema.parse(body);

    // Check if gig exists
    const gig = await prisma.gig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Check if already applied
    const existingApplication = await prisma.gigApplication.findUnique({
      where: { gigId_applicantId: { gigId, applicantId: session.user.id } },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied to this gig" },
        { status: 400 }
      );
    }

    // Create application
    const application = await prisma.gigApplication.create({
      data: {
        gigId,
        applicantId: session.user.id,
        coverLetter: coverLetter || null,
      },
      include: {
        applicant: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Create notification for gig poster
    await prisma.notification.create({
      data: {
        userId: gig.posterId,
        gigId,
        type: "gig_application",
        title: "New Application",
        message: `${session.user.name} applied to your gig: ${gig.title}`,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed" },
        { status: 400 }
      );
    }

    console.error("Error applying to gig:", error);
    return NextResponse.json(
      { error: "Failed to apply to gig" },
      { status: 500 }
    );
  }
}
