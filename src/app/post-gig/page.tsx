"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function PostGigPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "coding",
    skillsNeeded: "",
    budget: "",
    duration: "one-time",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        const { url } = await res.json();
        urls.push(url);
      }
      setAttachments((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          skillsNeeded: formData.skillsNeeded
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          budget: parseFloat(formData.budget),
          duration: formData.duration,
          attachments,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post gig");
      }

      router.push("/gigs?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <p className="text-white text-lg mb-4">Please log in to post a gig</p>
            <Link href="/login">
              <Button>Log In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Content */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Post a New Gig</h1>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                Gig Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Write a 1000-word article about Python"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 min-h-32"
                placeholder="Describe the details of your gig..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="writing">Writing</option>
                  <option value="design">Design</option>
                  <option value="tutoring">Tutoring</option>
                  <option value="coding">Coding</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-slate-300 mb-2">
                  Duration *
                </label>
                <select
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="one-time">One-time</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-slate-300 mb-2">
                Budget (USD) *
              </label>
              <input
                id="budget"
                name="budget"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="50.00"
              />
            </div>

            <div>
              <label htmlFor="skillsNeeded" className="block text-sm font-medium text-slate-300 mb-2">
                Required Skills (comma-separated)
              </label>
              <input
                id="skillsNeeded"
                name="skillsNeeded"
                type="text"
                value={formData.skillsNeeded}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Python, Web Development, SEO"
              />
              {formData.skillsNeeded && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skillsNeeded.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Attachments <span className="text-slate-500">(optional — PDF, images, docs up to 5 MB each)</span>
              </label>
              <label className="flex items-center gap-3 px-4 py-3 bg-slate-700 border border-dashed border-slate-500 rounded-md cursor-pointer hover:border-blue-500 transition-colors group">
                <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-slate-400 group-hover:text-slate-200 text-sm">
                  {uploading ? "Uploading..." : "Click to upload files"}
                </span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((url) => (
                    <li key={url} className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-md">
                      <span className="text-slate-300 text-sm truncate">📎 {url.split("/").pop()}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(url)}
                        className="text-slate-500 hover:text-red-400 text-sm ml-2 shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Posting..." : "Post Gig"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
