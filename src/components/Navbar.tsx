"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; read: boolean; createdAt: string }[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSignOut = () => signOut({ redirect: true, callbackUrl: "/" });

  // Poll unread count every 30 seconds when logged in
  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/user/stats");
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unreadMessages || 0);
          setUnreadNotifications(data.notifications || 0);
        }
      } catch {
        // silent
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [status]);

  const openNotifications = async () => {
    if (!showNotifications) {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
        // Mark all as read
        await fetch("/api/notifications", { method: "PATCH" });
        setUnreadNotifications(0);
      } catch {
        // silent
      }
    }
    setShowNotifications(!showNotifications);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">📚</span>
            <span className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              Campus Gigs
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/gigs"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Browse Gigs
            </Link>
            <Link
              href="/projects"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/people"
              className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              People
            </Link>
            {session && (
              <Link
                href="/messages"
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors relative"
              >
                Messages
                {unreadMessages > 0 && (
                  <span className="absolute -top-2 -right-3 bg-rose-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {status === "loading" ? (
              <div className="w-20 h-8 bg-slate-800 rounded-md animate-pulse" />
            ) : session ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/post-gig">
                  <Button variant="outline" size="sm">
                    Post a Gig
                  </Button>
                </Link>
                {/* Theme Toggle */}
                {mounted && (
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-md hover:bg-slate-800"
                    aria-label="Toggle theme"
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {theme === "dark" ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                  </button>
                )}
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={openNotifications}
                    className="relative w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    aria-label="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </span>
                    )}
                  </button>
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">Notifications</span>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-slate-500 text-sm">No notifications yet</div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`px-4 py-3 border-b border-slate-700/50 text-sm ${n.read ? "text-slate-400" : "text-white bg-slate-700/30"}`}>
                              <p>{n.message}</p>
                              <p className="text-xs text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
                  <Link href="/profile" className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white hover:bg-blue-500 transition-colors" title="My Profile">
                    {session.user?.name?.charAt(0).toUpperCase()}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign up free</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-800 py-4 space-y-3">
            <Link href="/gigs" className="block text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
              Browse Gigs
            </Link>
            <Link href="/projects" className="block text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
              Projects
            </Link>
            {session ? (
              <>
                <Link href="/messages" className="flex items-center gap-2 text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Messages
                  {unreadMessages > 0 && <span className="bg-rose-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadMessages}</span>}
                </Link>
                <Link href="/dashboard" className="block text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/profile" className="block text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  My Profile
                </Link>
                <Link href="/post-gig" className="block text-slate-300 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>
                  Post a Gig
                </Link>
                <button onClick={handleSignOut} className="block text-slate-400 hover:text-white py-2 text-sm">
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" size="sm">Log in</Button>
                </Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)}>
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
