"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Person {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  skills: string;
  university?: string;
  major?: string;
  yearsOfStudy?: string;
  githubUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  createdAt: string;
  _count: { postedGigs: number; createdProjects: number };
}

function Avatar({ user, size = 12 }: { user: { name: string; avatar?: string }; size?: number }) {
  const sz = `w-${size} h-${size}`;
  return user.avatar ? (
    <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover`} />
  ) : (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PeoplePage() {
  const { data: session } = useSession();
  const [people, setPeople] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchPeople = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (q) params.set("search", q);
      const res = await fetch(`/api/people?${params}`);
      const data = await res.json();
      setPeople(data.users ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPeople(search, page); }, [search, page, fetchPeople]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Community</h1>
          <p className="text-slate-400">
            {total > 0 ? `${total} student${total !== 1 ? "s" : ""} on Campus Gigs` : "Discover students on Campus Gigs"}
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, university, or major…"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-medium">
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
              Clear
            </button>
          )}
        </form>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-slate-700" />
                  <div className="flex-1 space-y-2"><div className="h-4 bg-slate-700 rounded w-3/4"/><div className="h-3 bg-slate-700 rounded w-1/2"/></div>
                </div>
                <div className="space-y-2"><div className="h-3 bg-slate-700 rounded"/><div className="h-3 bg-slate-700 rounded w-2/3"/></div>
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">👥</p>
            <p className="text-white font-semibold text-lg mb-2">No students found</p>
            <p className="text-slate-400 text-sm">{search ? "Try a different search term" : "Be the first to sign up!"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {people.map((person) => {
              const skills: string[] = JSON.parse(person.skills || "[]");
              const isMe = session?.user?.id === person.id;
              return (
                <Link key={person.id} href={`/people/${person.id}`}
                  className="group bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 hover:bg-slate-700/50 transition-all block">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar user={person} size={12} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">{person.name}</p>
                        {isMe && <span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>}
                      </div>
                      {person.university && <p className="text-slate-400 text-xs truncate mt-0.5">{person.university}</p>}
                      {person.major && <p className="text-slate-500 text-xs truncate">{person.major}</p>}
                    </div>
                  </div>
                  {person.bio && (
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3 leading-relaxed">{person.bio}</p>
                  )}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {skills.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                      {skills.length > 3 && <span className="text-xs text-slate-500">+{skills.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{person._count.postedGigs} gig{person._count.postedGigs !== 1 ? "s" : ""}</span>
                    <span>{person._count.createdProjects} project{person._count.createdProjects !== 1 ? "s" : ""}</span>
                    <div className="flex gap-2">
                      {person.githubUrl && <span title="GitHub">⌨️</span>}
                      {person.websiteUrl && <span title="Website">🌐</span>}
                      {person.linkedinUrl && <span title="LinkedIn">💼</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
              ← Prev
            </button>
            <span className="text-slate-400 text-sm">Page {page} of {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
