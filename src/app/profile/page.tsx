"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Camera, Globe, Lock } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  bio: string;
  university: string;
  major: string;
  yearsOfStudy: string;
  skills: string[];
  avatar?: string;
  profileVisibility?: string;
  githubUrl?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  _count?: {
    postedGigs: number;
    createdProjects: number;
    applications: number;
  };
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    university: "",
    major: "",
    yearsOfStudy: "",
    skills: "",
    githubUrl: "",
    websiteUrl: "",
    linkedinUrl: "",
    twitterUrl: "",
  });

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setProfile(data.user);
        setForm({
          name: data.user.name || "",
          bio: data.user.bio || "",
          university: data.user.university || "",
          major: data.user.major || "",
          yearsOfStudy: data.user.yearsOfStudy || "",
          skills: (data.user.skills || []).join(", "),
          githubUrl: data.user.githubUrl || "",
          websiteUrl: data.user.websiteUrl || "",
          linkedinUrl: data.user.linkedinUrl || "",
          twitterUrl: data.user.twitterUrl || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [status]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveSuccess(false);
    setSaveError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          university: form.university,
          major: form.major,
          githubUrl: form.githubUrl,
          websiteUrl: form.websiteUrl,
          linkedinUrl: form.linkedinUrl,
          twitterUrl: form.twitterUrl,
          yearsOfStudy: form.yearsOfStudy,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Save failed");
      }
      const data = await res.json();
      setProfile((prev) => ({ ...prev!, ...data.user }));
      setSaveSuccess(true);
      setIsEditing(false);
      // Refresh the session name
      await update({ name: form.name });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Compress image client-side to stay under Vercel's 4.5 MB body limit
  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = URL.createObjectURL(file);
    });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      // Compress to keep well under Vercel's 4.5 MB body limit
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", new File([compressed], file.name, { type: "image/jpeg" }));
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // Handle non-JSON responses (Vercel 413 returns plain text)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      const url = data.url;
      // Save avatar URL
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: url }),
      });
      setProfile((prev) => prev ? { ...prev, avatar: url } : prev);
      // Refresh session so Navbar avatar updates
      await update();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleVisibilityToggle = async () => {
    if (!profile || visibilitySaving) return;
    const next = profile.profileVisibility === "private" ? "public" : "private";
    setVisibilitySaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileVisibility: next }),
      });
      if (!res.ok) throw new Error();
      setProfile((prev) => prev ? { ...prev, profileVisibility: next } : prev);
    } catch {
      alert("Could not update profile visibility.");
    } finally {
      setVisibilitySaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-20 w-20 bg-slate-800 rounded-full mx-auto" />
            <div className="h-6 bg-slate-800 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-slate-800 rounded w-1/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          <span>/</span>
          <span className="text-slate-300">My Profile</span>
        </div>

        {/* Profile Header */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Avatar with upload */}
            <div className="flex flex-col items-center gap-2">
              <Avatar
                src={profile.avatar}
                name={profile.name}
                size={20}
                editable
                uploading={avatarUploading}
                onUpload={handleAvatarUpload}
              />
              <label className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                <Camera className="w-3.5 h-3.5" />
                {avatarUploading ? "Uploading..." : profile.avatar ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
              <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
              {profile.university && (
                <p className="text-slate-400 text-sm">
                  {profile.university}
                  {profile.major && ` · ${profile.major}`}
                  {profile.yearsOfStudy && ` · Year ${profile.yearsOfStudy}`}
                </p>
              )}
            </div>

            {/* Edit toggle + Visibility */}
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                onClick={handleVisibilityToggle}
                disabled={visibilitySaving}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  profile.profileVisibility === "private"
                    ? "bg-amber-900/30 border-amber-700 text-amber-300 hover:bg-amber-900/50"
                    : "bg-emerald-900/30 border-emerald-700 text-emerald-300 hover:bg-emerald-900/50"
                }`}
              >
                {profile.profileVisibility === "private" ? (
                  <><Lock className="w-3.5 h-3.5" /> Private Profile</>
                ) : (
                  <><Globe className="w-3.5 h-3.5" /> Public Profile</>
                )}
              </button>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => { setIsEditing(!isEditing); setSaveSuccess(false); setSaveError(""); }}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          {profile._count && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{profile._count.postedGigs}</div>
                <div className="text-xs text-slate-400 mt-1">Gigs Posted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{profile._count.createdProjects}</div>
                <div className="text-xs text-slate-400 mt-1">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{profile._count.applications}</div>
                <div className="text-xs text-slate-400 mt-1">Applications</div>
              </div>
            </div>
          )}
        </div>

        {/* Bio & Skills (view mode) */}
        {!isEditing && (
          <div className="space-y-4">
            {profile.bio && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Bio</h2>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            {profile.skills?.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="bg-slate-700 text-slate-200 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!profile.bio && !profile.skills?.length && !
              (profile as ProfileData & { githubUrl?: string }).githubUrl && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-500 mb-4">Your profile is empty. Add a bio and skills to stand out!</p>
                <Button onClick={() => setIsEditing(true)}>Complete Profile</Button>
              </div>
            )}
            {(profile.githubUrl || profile.websiteUrl || profile.linkedinUrl || profile.twitterUrl) && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Links</h2>
                <div className="flex flex-wrap gap-4">
                  {profile.githubUrl && (
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                      GitHub
                    </a>
                  )}
                  {profile.websiteUrl && (
                    <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                      Website
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {profile.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      X / Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit form */}
        {isEditing && (
          <form onSubmit={handleSave} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
            {saveError && (
              <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="bg-emerald-900/20 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-md text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
              <input
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
              <textarea
                name="bio"
                rows={4}
                value={form.bio}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Tell others about yourself, your interests and experience..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">University</label>
                <input
                  name="university"
                  value={form.university}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., MIT"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Major / Field</label>
                <input
                  name="major"
                  value={form.major}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Year of Study</label>
              <select
                name="yearsOfStudy"
                value={form.yearsOfStudy}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select year</option>
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
                <option value="5">Year 5+</option>
                <option value="graduate">Graduate</option>
                <option value="phd">PhD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Skills <span className="text-slate-500">(comma-separated)</span>
              </label>
              <input
                name="skills"
                value={form.skills}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Python, React, Graphic Design, Research"
              />
              {/* Live skill tags preview */}
              {form.skills && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill) => (
                    <span key={skill} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Social Links</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">GitHub Profile URL</label>
                  <input
                    name="githubUrl"
                    type="url"
                    value={form.githubUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Personal Website</label>
                  <input
                    name="websiteUrl"
                    type="url"
                    value={form.websiteUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn</label>
                  <input
                    name="linkedinUrl"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">X / Twitter</label>
                  <input
                    name="twitterUrl"
                    type="url"
                    value={form.twitterUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="https://x.com/username"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
