"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function CreateProjectPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "web-app",
    skillsNeeded: "",
    maxMembers: "5",
    visibility: "public" as "public" | "private",
    readme: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/projects", {
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
          maxMembers: parseInt(formData.maxMembers),
          visibility: formData.visibility,
          readme: formData.readme || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      router.push("/projects?success=true");
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
            <p className="text-white text-lg mb-4">Please log in to create a project</p>
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
        <h1 className="text-3xl font-bold text-white mb-8">Create a New Project</h1>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
                Project Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Build a Student Marketplace App"
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
                placeholder="Describe your project goals and vision..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                  Project Type *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="web-app">Web App</option>
                  <option value="mobile">Mobile App</option>
                  <option value="research">Research</option>
                  <option value="business">Business</option>
                  <option value="startup">Startup</option>
                </select>
              </div>

              <div>
                <label htmlFor="maxMembers" className="block text-sm font-medium text-slate-300 mb-2">
                  Max Team Size *
                </label>
                <input
                  id="maxMembers"
                  name="maxMembers"
                  type="number"
                  required
                  min="2"
                  max="20"
                  value={formData.maxMembers}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
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
                placeholder="e.g., React, Node.js, MongoDB"
              />
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Project Visibility</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, visibility: "public" }))}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
                    formData.visibility === "public"
                      ? "border-emerald-500 bg-emerald-900/20"
                      : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}
                >
                  <span className="text-2xl">🌎</span>
                  <div>
                    <p className="font-medium text-white text-sm">Public</p>
                    <p className="text-xs text-slate-400">Anyone can view files & discussions</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, visibility: "private" }))}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
                    formData.visibility === "private"
                      ? "border-rose-500 bg-rose-900/20"
                      : "border-slate-600 bg-slate-700 hover:border-slate-500"
                  }`}
                >
                  <span className="text-2xl">🔒</span>
                  <div>
                    <p className="font-medium text-white text-sm">Private</p>
                    <p className="text-xs text-slate-400">Only contributors can access content</p>
                  </div>
                </button>
              </div>
            </div>

            {/* README */}
            <div>
              <label htmlFor="readme" className="block text-sm font-medium text-slate-300 mb-2">
                README / Project Overview <span className="text-slate-500 text-xs font-normal">(optional, markdown supported)</span>
              </label>
              <textarea
                id="readme"
                name="readme"
                value={formData.readme}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono text-sm"
                placeholder="## My Project&#10;&#10;A brief overview of what this project is about, how to get started, and contribution guidelines..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
