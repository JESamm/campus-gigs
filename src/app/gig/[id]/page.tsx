"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Paperclip, CheckCircle2, Star, MessageSquare, ThumbsUp, ThumbsDown, User } from "lucide-react";

interface GigDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  duration: string;
  skillsNeeded: string[];
  attachments: string[];
  status: string;
  createdAt: string;
  poster: {
    id: string;
    name: string;
    university?: string;
    major?: string;
    bio?: string;
  };
  applications: {
    id: string;
    coverLetter: string;
    status: string;
    appliedAt: string;
    applicant: {
      id: string;
      name: string;
      university?: string;
      avatar?: string;
      skills: string[];
      ratingAvg: number;
      ratingCount: number;
    };
  }[];
  _count: { applications: number };
}

export default function GigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [gig, setGig] = useState<GigDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Apply modal state
  const [showApply, setShowApply] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Delete state (for gig owner)
  const [deleting, setDeleting] = useState(false);

  // Accept/reject state
  const [actioningApp, setActioningApp] = useState<string | null>(null);

  useEffect(() => {
    const fetchGig = async () => {
      try {
        const res = await fetch(`/api/gigs/${id}`);
        if (!res.ok) throw new Error("Gig not found");
        const data = await res.json();
        setGig(data.gig);
        // Check if current user already applied
        if (session?.user?.id) {
          setAlreadyApplied(
            data.gig.applications.some(
              (a: { applicant: { id: string } }) => a.applicant.id === session.user.id
            )
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load gig");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchGig();
  }, [id, session]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetch("/api/gigs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: id, coverLetter }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Application failed");
      }
      setApplySuccess(true);
      setAlreadyApplied(true);
      setShowApply(false);
      // Refresh gig to show updated count
      const data = await fetch(`/api/gigs/${id}`).then(r => r.json());
      setGig(data.gig);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: "accepted" | "rejected") => {
    setActioningApp(applicationId);
    try {
      const res = await fetch("/api/gigs/apply/accept", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      if (res.ok) {
        // Refresh gig data
        const data = await fetch(`/api/gigs/${id}`).then(r => r.json());
        setGig(data.gig);
      }
    } catch {
      // silent
    } finally {
      setActioningApp(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this gig? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/gigs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/gigs");
    } catch {
      alert("Could not delete gig.");
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-2/3 mx-auto" />
            <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400 text-lg mb-4">{error || "Gig not found"}</p>
          <Link href="/gigs"><Button>Back to Gigs</Button></Link>
        </div>
      </div>
    );
  }

  const isOwner = session?.user?.id === gig.poster.id;
  const isFull = gig.status === "closed";

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/gigs" className="hover:text-slate-300 transition-colors">Gigs</Link>
          <span>/</span>
          <span className="text-slate-300">{gig.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="inline-block bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-xs font-medium mb-3">
                    {gig.category}
                  </span>
                  <h1 className="text-2xl font-bold text-white">{gig.title}</h1>
                </div>
                {isFull && (
                  <span className="shrink-0 bg-red-900/40 text-red-300 border border-red-700 px-3 py-1 rounded-full text-xs">
                    Closed
                  </span>
                )}
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {gig.description}
              </p>
            </div>

            {/* Skills */}
            {gig.skillsNeeded.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.skillsNeeded.map((skill) => (
                    <span
                      key={skill}
                      className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {gig.attachments.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Attachments</h2>
                <ul className="space-y-2">
                  {gig.attachments.map((url, i) => (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                      >
                        <Paperclip className="w-4 h-4" />
                        {url.split("/").pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Applications (owner only) */}
            {isOwner && gig.applications.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  Applicants ({gig._count.applications})
                </h2>
                <div className="space-y-4">
                  {gig.applications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-slate-700/30 border border-slate-600 rounded-xl p-5 hover:border-slate-500 transition-colors"
                    >
                      {/* Top row: avatar, name, rating, status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <Link href={`/people/${app.applicant.id}`} className="flex items-center gap-3 group">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {app.applicant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium text-white group-hover:text-blue-400 transition-colors">{app.applicant.name}</span>
                            {app.applicant.university && (
                              <p className="text-slate-500 text-xs">{app.applicant.university}</p>
                            )}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Star rating */}
                          <div className="flex items-center gap-1" title={`${app.applicant.ratingAvg}/5 from ${app.applicant.ratingCount} reviews`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${s <= Math.round(app.applicant.ratingAvg) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`}
                              />
                            ))}
                            <span className="text-xs text-slate-400 ml-1">
                              {app.applicant.ratingCount > 0 ? `${app.applicant.ratingAvg}` : "New"}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              app.status === "accepted"
                                ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                                : app.status === "rejected"
                                ? "bg-red-900/40 text-red-300 border border-red-700"
                                : "bg-slate-600/50 text-slate-300 border border-slate-500"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                      </div>

                      {/* Skills */}
                      {app.applicant.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {app.applicant.skills.slice(0, 5).map((skill: string) => (
                            <span key={skill} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{skill}</span>
                          ))}
                          {app.applicant.skills.length > 5 && <span className="text-xs text-slate-500">+{app.applicant.skills.length - 5}</span>}
                        </div>
                      )}

                      {/* Cover letter */}
                      {app.coverLetter && (
                        <p className="text-slate-400 text-sm whitespace-pre-wrap mb-3 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                          {app.coverLetter}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                        <span className="text-xs text-slate-500 mr-auto">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                        {app.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-400 border-emerald-700 hover:bg-emerald-900/30"
                              disabled={actioningApp === app.id}
                              onClick={() => handleApplicationAction(app.id, "accepted")}
                            >
                              <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-700 hover:bg-red-900/30"
                              disabled={actioningApp === app.id}
                              onClick={() => handleApplicationAction(app.id, "rejected")}
                            >
                              <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        <Link href={`/messages?to=${app.applicant.id}&name=${encodeURIComponent(app.applicant.name)}`}>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: sidebar */}
          <div className="space-y-4">
            {/* Budget card */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <div className="text-4xl font-bold text-emerald-400 mb-1">
                ${gig.budget.toFixed(2)}
              </div>
              <div className="text-slate-400 text-sm mb-4">{gig.duration}</div>
              <div className="text-slate-500 text-sm">
                {gig._count.applications} application{gig._count.applications !== 1 ? "s" : ""}
              </div>

              <div className="mt-4 space-y-2">
                {isOwner ? (
                  <>
                    <Link href="/post-gig">
                      <Button className="w-full" variant="outline">
                        Post Another Gig
                      </Button>
                    </Link>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete Gig"}
                    </Button>
                  </>
                ) : applySuccess || alreadyApplied ? (
                  <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Application submitted!
                  </div>
                ) : isFull ? (
                  <Button className="w-full" disabled>
                    Gig Closed
                  </Button>
                ) : !session ? (
                  <Link href="/login">
                    <Button className="w-full">Log in to Apply</Button>
                  </Link>
                ) : (
                  <Button className="w-full" onClick={() => setShowApply(true)}>
                    Apply Now
                  </Button>
                )}
                {session && !isOwner && (
                  <Link href={`/messages?with=${gig.poster.id}`}>
                    <Button className="w-full" variant="outline">
                      Message Poster
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Poster card */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Posted by
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  {gig.poster.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white font-medium">{gig.poster.name}</div>
                  {gig.poster.university && (
                    <div className="text-slate-400 text-xs">{gig.poster.university}</div>
                  )}
                </div>
              </div>
              {gig.poster.major && (
                <p className="text-slate-500 text-sm">{gig.poster.major}</p>
              )}
              {gig.poster.bio && (
                <p className="text-slate-400 text-sm mt-2 line-clamp-3">{gig.poster.bio}</p>
              )}
              <div className="mt-3 text-xs text-slate-600">
                Posted {new Date(gig.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Apply Modal */}
      {showApply && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowApply(false); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Apply for this Gig</h2>
            <p className="text-slate-400 text-sm mb-4">{gig.title}</p>

            {applyError && (
              <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4 text-sm">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cover Letter <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Tell the poster why you're the right person for this gig..."
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowApply(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={applying}>
                  {applying ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
