"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

interface UserStats {
  // personal
  gigs: number;
  projects: number;
  applications: number;
  notifications: number;
  unreadMessages: number;
  // platform-wide
  totalUsers: number;
  totalGigs: number;
  totalProjects: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats>({
    gigs: 0,
    projects: 0,
    applications: 0,
    notifications: 0,
    unreadMessages: 0,
    totalUsers: 0,
    totalGigs: 0,
    totalProjects: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [status, router]);

  const Skeleton = () => (
    <span className="inline-block w-10 h-8 bg-slate-700 rounded animate-pulse" />
  );

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-1">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-slate-400 text-sm">{session?.user?.email}</p>
        </div>

        {/* ── Platform Stats ── */}
        <div className="mb-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Platform Overview
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Students Registered", value: stats.totalUsers, icon: "👥", color: "text-blue-400" },
              { label: "Gigs Posted", value: stats.totalGigs, icon: "📋", color: "text-emerald-400" },
              { label: "Active Projects", value: stats.totalProjects, icon: "🤝", color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <div className={`text-3xl font-bold ${s.color}`}>
                    {isLoading ? <Skeleton /> : s.value.toLocaleString()}
                  </div>
                  <div className="text-slate-400 text-sm mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── My Activity ── */}
        <div className="mb-10">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 mt-8">
            My Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Gigs I Posted", value: stats.gigs, color: "text-emerald-400", href: "/gigs" },
              { label: "Projects Joined", value: stats.projects, color: "text-purple-400", href: "/projects" },
              { label: "Applications", value: stats.applications, color: "text-yellow-400", href: "/gigs" },
              { label: "Unread Messages", value: stats.unreadMessages, color: "text-rose-400", href: "/messages" },
              { label: "Notifications", value: stats.notifications, color: "text-sky-400", href: "#" },
            ].map((s) => (
              <Link key={s.label} href={s.href}>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-colors cursor-pointer">
                  <div className={`text-3xl font-bold ${s.color}`}>
                    {isLoading ? <Skeleton /> : s.value}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-7">
            <div className="text-2xl mb-3">📋</div>
            <h2 className="text-lg font-bold text-white mb-2">Gig Marketplace</h2>
            <p className="text-slate-400 text-sm mb-5">
              Post a gig or browse freelance work that fits your schedule.
            </p>
            <div className="flex gap-3">
              <Link href="/post-gig">
                <Button size="sm">Post a Gig</Button>
              </Link>
              <Link href="/gigs">
                <Button size="sm" variant="outline">Browse</Button>
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-7">
            <div className="text-2xl mb-3">🤝</div>
            <h2 className="text-lg font-bold text-white mb-2">Collaboration Projects</h2>
            <p className="text-slate-400 text-sm mb-5">
              Create a project or join existing ones to collaborate with peers.
            </p>
            <div className="flex gap-3">
              <Link href="/create-project">
                <Button size="sm">Create</Button>
              </Link>
              <Link href="/projects">
                <Button size="sm" variant="outline">Browse</Button>
              </Link>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-7">
            <div className="text-2xl mb-3">💬</div>
            <h2 className="text-lg font-bold text-white mb-2">Messages</h2>
            <p className="text-slate-400 text-sm mb-5">
              Chat with collaborators and gig partners directly.
            </p>
            <div className="flex gap-3 items-center">
              <Link href="/messages">
                <Button size="sm">Open Messages</Button>
              </Link>
              {stats.unreadMessages > 0 && (
                <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.unreadMessages} new
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-7">
            <div className="text-2xl mb-3">👤</div>
            <h2 className="text-lg font-bold text-white mb-2">My Profile</h2>
            <p className="text-slate-400 text-sm mb-5">
              Update your bio, skills, university and year of study.
            </p>
            <Link href="/profile">
              <Button size="sm">Edit Profile</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
