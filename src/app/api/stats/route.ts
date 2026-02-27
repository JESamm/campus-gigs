import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/stats — public platform-wide counts, no auth required
export async function GET() {
  try {
    const [totalUsers, totalGigs, totalProjects] = await Promise.all([
      prisma.user.count(),
      prisma.gig.count({ where: { status: "open" } }),
      prisma.project.count({ where: { status: "open" } }),
    ]);

    return NextResponse.json({ totalUsers, totalGigs, totalProjects });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    return NextResponse.json({ totalUsers: 0, totalGigs: 0, totalProjects: 0 });
  }
}
