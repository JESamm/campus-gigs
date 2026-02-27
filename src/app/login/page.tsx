import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </a>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <Suspense fallback={<div className="text-white">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
