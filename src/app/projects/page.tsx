"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Info } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  maxMembers: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count: {
    members: number;
  };
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const query = new URLSearchParams();
        if (selectedCategory) query.append("category", selectedCategory);
        const res = await fetch(`/api/projects?${query.toString()}`);
        const data = await res.json();
        setProjects(data.projects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [selectedCategory]);

  const categories = ["web-app", "mobile", "research", "business", "startup"];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Guest CTA banner */}
      {!session && (
        <div className="bg-purple-900/30 border-b border-purple-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-purple-200 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 flex-shrink-0" /> You&apos;re browsing as a guest. Sign up to join or create projects!
            </p>
            <Link href="/signup">
              <Button size="sm">Sign up free</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Collaboration Projects</h1>
          {session && (
            <Link href="/create-project">
              <Button>+ New Project</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "" ? "default" : "outline"}
            onClick={() => setSelectedCategory("")}
          >
            All Projects
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.replace("-", " ").toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-300">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-lg">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-purple-500 transition cursor-pointer h-full">
                  <div className="mb-4">
                    <span className="inline-block bg-purple-900 text-purple-200 px-3 py-1 rounded-full text-sm mb-2">
                      {project.category.replace("-", " ")}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">
                        {project.createdBy.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {project._count.members} / {project.maxMembers} members
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                      {Math.round(
                        (project._count.members / project.maxMembers) * 100
                      )}
                      %
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
