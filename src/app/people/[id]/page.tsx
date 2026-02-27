"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

interface PublicUser {
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
  _count: { postedGigs: number; createdProjects: number; applications: number };
  gigs: { id: string; title: string; budget: number; createdAt: string }[];
  projects: { id: string; title: string; status: string; skills: string; createdAt: string }[];
}

function Avatar({ user, size = 20 }: { user: { name: string; avatar?: string }; size?: number }) {
  const sz = `w-${size} h-${size}`;
  return user.avatar ? (
    <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover ring-4 ring-slate-700`} />
  ) : (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-3xl ring-4 ring-slate-700 flex-shrink-0`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/people/${id}`)
      .then((r) => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then((d) => {
        if (d && d.user) {
          setUser({
            ...d.user,
            gigs: d.user.gigs ?? [],
            projects: d.user.projects ?? [],
            _count: {
              postedGigs: d.user._count?.postedGigs ?? 0,
              createdProjects: d.user._count?.createdProjects ?? 0,
              applications: d.user._count?.applications ?? 0,
            },
          });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="flex gap-5"><div className="w-20 h-20 rounded-full bg-slate-700"/><div className="flex-1 space-y-3 pt-2"><div className="h-6 bg-slate-700 rounded w-48"/><div className="h-4 bg-slate-700 rounded w-64"/></div></div>
      </div>
    </div>
  );

  if (notFound || !user) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">👤</p>
        <h1 className="text-white text-2xl font-bold mb-2">User not found</h1>
        <p className="text-slate-400 mb-6">This profile doesn&apos;t exist or has been removed.</p>
        <Link href="/people" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors">Browse Community</Link>
      </div>
    </div>
  );

  const skills: string[] = (() => { try { return JSON.parse(user.skills || "[]"); } catch { return []; } })();
  const isMe = session?.user?.id === user.id;
  const joined = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Profile header */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar user={user} size={20} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-white text-2xl font-bold">{user.name}</h1>
                {isMe && <span className="text-sm bg-blue-900/40 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">You</span>}
              </div>
              {(user.university || user.major) && (
                <p className="text-slate-400 text-sm mb-1">
                  {[user.major, user.university].filter(Boolean).join(" · ")}
                  {user.yearsOfStudy && ` · Year ${user.yearsOfStudy}`}
                </p>
              )}
              <p className="text-slate-500 text-xs mb-4">Joined {joined}</p>

              {/* Bio */}
              {user.bio && <p className="text-slate-300 text-sm leading-relaxed mb-4">{user.bio}</p>}

              {/* Social links */}
              <div className="flex flex-wrap gap-3">
                {user.githubUrl && (
                  <a href={user.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </a>
                )}
                {user.websiteUrl && (
                  <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                    Website
                  </a>
                )}
                {user.linkedinUrl && (
                  <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {user.twitterUrl && (
                  <a href={user.twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X / Twitter
                  </a>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 sm:items-end">
              {isMe ? (
                <Link href="/profile" className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl hover:bg-slate-600 transition-colors text-sm font-medium">
                  Edit Profile
                </Link>
              ) : session ? (
                <Link href={`/messages?to=${user.id}&name=${encodeURIComponent(user.name)}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors text-sm font-medium">
                  💬 Message
                </Link>
              ) : null}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-700">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="text-sm bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-5 pt-5 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-white font-bold text-xl">{user._count.postedGigs}</p><p className="text-slate-500 text-xs mt-0.5">Gigs Posted</p></div>
            <div><p className="text-white font-bold text-xl">{user._count.createdProjects}</p><p className="text-slate-500 text-xs mt-0.5">Projects</p></div>
            <div><p className="text-white font-bold text-xl">{user._count.applications}</p><p className="text-slate-500 text-xs mt-0.5">Applications</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gigs */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>💼</span> Open Gigs
              {user._count.postedGigs > user.gigs.length && (
                <span className="text-slate-500 text-xs font-normal">({user.gigs.length} of {user._count.postedGigs})</span>
              )}
            </h2>
            {user.gigs.length === 0 ? (
              <p className="text-slate-500 text-sm">No open gigs posted yet.</p>
            ) : (
              <ul className="space-y-3">
                {user.gigs.map((g) => (
                  <li key={g.id}>
                    <Link href={`/gigs/${g.id}`} className="group block">
                      <p className="text-slate-200 text-sm group-hover:text-blue-400 transition-colors font-medium">{g.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">${g.budget} · {new Date(g.createdAt).toLocaleDateString()}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/gigs?poster=${user.id}`} className="mt-4 block text-blue-400 hover:text-blue-300 text-xs transition-colors">
              View all gigs →
            </Link>
          </div>

          {/* Projects */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>🚀</span> Public Projects
              {user._count.createdProjects > user.projects.length && (
                <span className="text-slate-500 text-xs font-normal">({user.projects.length} of {user._count.createdProjects})</span>
              )}
            </h2>
            {user.projects.length === 0 ? (
              <p className="text-slate-500 text-sm">No public projects yet.</p>
            ) : (
              <ul className="space-y-3">
                {user.projects.map((p) => {
                  const pSkills: string[] = JSON.parse(p.skills || "[]");
                  return (
                    <li key={p.id}>
                      <Link href={`/project/${p.id}`} className="group block">
                        <p className="text-slate-200 text-sm group-hover:text-blue-400 transition-colors font-medium">{p.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "open" ? "bg-green-900/40 text-green-400" : "bg-slate-700 text-slate-400"}`}>{p.status}</span>
                          {pSkills.slice(0, 2).map((s) => <span key={s} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href={`/projects?creator=${user.id}`} className="mt-4 block text-blue-400 hover:text-blue-300 text-xs transition-colors">
              View all projects →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
