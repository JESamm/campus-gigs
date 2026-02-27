import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/stats — dashboard stats for the current user + platform totals
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [
      gigs,
      projects,
      applications,
      notifications,
      unreadMessages,
      totalUsers,
      totalGigs,
      totalProjects,
    ] = await Promise.all([
      prisma.gig.count({ where: { posterId: userId } }),
      prisma.projectMember.count({ where: { userId } }),
      prisma.gigApplication.count({ where: { applicantId: userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.message.count({ where: { recipientId: userId, read: false } }),
      prisma.user.count(),
      prisma.gig.count(),
      prisma.project.count(),
    ]);

    return NextResponse.json({
      // personal
      gigs,
      projects,
      applications,
      notifications,
      unreadMessages,
      // platform-wide
      totalUsers,
      totalGigs,
      totalProjects,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
