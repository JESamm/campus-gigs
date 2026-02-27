import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/gigs/apply — accept or reject an application
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, action } = await request.json();
    if (!applicationId || !["accepted", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const application = await prisma.gigApplication.findUnique({
      where: { id: applicationId },
      include: { gig: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Only the gig poster can accept/reject
    if (application.gig.posterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.gigApplication.update({
      where: { id: applicationId },
      data: {
        status: action,
        respondedAt: new Date(),
        acceptedById: action === "accepted" ? session.user.id : null,
      },
    });

    // Notify the applicant
    await prisma.notification.create({
      data: {
        userId: application.applicantId,
        gigId: application.gigId,
        type: action === "accepted" ? "application_accepted" : "application_rejected",
        title: action === "accepted" ? "Application Accepted!" : "Application Update",
        message: action === "accepted"
          ? `Your application for "${application.gig.title}" has been accepted!`
          : `Your application for "${application.gig.title}" was not accepted.`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/gigs/apply:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
