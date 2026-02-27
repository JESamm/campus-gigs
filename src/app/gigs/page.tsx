"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

interface Gig {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  duration: string;
  poster: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count: {
    applications: number;
  };
}

export default function GigsPage() {
  const { data: session } = useSession();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    const fetchGigs = async () => {
      try {
        const query = new URLSearchParams();
        if (selectedCategory) query.append("category", selectedCategory);
        const res = await fetch(`/api/gigs?${query.toString()}`);
        const data = await res.json();
        setGigs(data.gigs);
      } catch (error) {
        console.error("Error fetching gigs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGigs();
  }, [selectedCategory]);

  const categories = ["writing", "design", "tutoring", "coding", "marketing"];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Guest CTA banner */}
      {!session && (
        <div className="bg-blue-900/30 border-b border-blue-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-blue-200 text-sm">
              👋 You&apos;re browsing as a guest. Sign up to apply for gigs!
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
          <h1 className="text-4xl font-bold text-white">Available Gigs</h1>
          {session && (
            <Link href="/post-gig">
              <Button>+ Post a Gig</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === "" ? "default" : "outline"}
            onClick={() => setSelectedCategory("")}
          >
            All Gigs
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>

        {/* Gigs Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-300">Loading gigs...</p>
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-300 text-lg">No gigs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <Link key={gig.id} href={`/gig/${gig.id}`}>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition cursor-pointer h-full">
                  <div className="mb-4">
                    <span className="inline-block bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm mb-2">
                      {gig.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {gig.title}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {gig.description}
                  </p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-emerald-400">
                      ${gig.budget}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {gig.duration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="text-sm text-slate-400">
                      {gig.poster.name}
                    </div>
                    <span className="text-xs text-slate-500">
                      {gig._count.applications} applications
                    </span>
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
