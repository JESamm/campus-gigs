"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

interface ProjectMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; avatar?: string; university?: string; major?: string };
}
interface ProjectFile {
  id: string; name: string; url: string; size: number;
  mimeType: string; path: string; createdAt: string;
  uploadedBy: { id: string; name: string; avatar?: string };
}
interface DiscussionReply {
  id: string; body: string; createdAt: string;
  author: { id: string; name: string; avatar?: string };
}
interface Discussion {
  id: string; title: string; body: string; pinned: boolean; closed: boolean; createdAt: string;
  author: { id: string; name: string; avatar?: string };
  replies: DiscussionReply[];
  _count: { replies: number };
}
interface ProjectDetail {
  id: string; title: string; description: string; category: string;
  maxMembers: number; skillsNeeded: string[]; status: string;
  visibility: string; readme?: string; createdAt: string;
  createdBy: { id: string; name: string; avatar?: string; university?: string; major?: string; bio?: string };
  members: ProjectMember[];
  _count: { members: number };
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("zip")||mime.includes("tar")) return "🧜️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  return "📁";
}
function Av({ user, size=8 }: { user:{name:string;avatar?:string}; size?:number }) {
  const sz = `w-${size} h-${size}`;
  return user.avatar
    ? <img src={user.avatar} alt={user.name} className={`${sz} rounded-full object-cover flex-shrink-0`} />
    : <div className={`${sz} rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-xs`}>{user.name.charAt(0).toUpperCase()}</div>;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"about"|"files"|"discussions"|"members">("about");

  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [discussionsLoaded, setDiscussionsLoaded] = useState(false);
  const [showNewDisc, setShowNewDisc] = useState(false);
  const [newDisc, setNewDisc] = useState({ title: "", body: "" });
  const [submittingDisc, setSubmittingDisc] = useState(false);
  const [openDiscId, setOpenDiscId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`).then(r=>r.json())
      .then(d=>{ if(d.project) setProject(d.project); else setError(d.error||"Not found"); })
      .catch(()=>setError("Failed to load")).finally(()=>setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activeTab==="files" && !filesLoaded) loadFiles();
    if (activeTab==="discussions" && !discussionsLoaded) loadDiscussions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadFiles = async () => {
    const r = await fetch(`/api/projects/${id}/files`);
    const d = await r.json();
    if (d.files) { setFiles(d.files); setFilesLoaded(true); }
  };
  const loadDiscussions = async () => {
    const r = await fetch(`/api/projects/${id}/discussions`);
    const d = await r.json();
    if (d.discussions) { setDiscussions(d.discussions); setDiscussionsLoaded(true); }
  };

  const isOwner = session?.user?.id === project?.createdBy.id;
  const isMember = project?.members.some(m=>m.user.id===session?.user?.id) ?? false;
  const canAccess = project?.visibility==="public" || isOwner || isMember;

  const handleJoin = async () => {
    if (!session) { router.push("/login"); return; }
    setJoining(true); setJoinMsg("");
    const res = await fetch("/api/projects/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId:id})});
    const d = await res.json();
    if (res.ok) {
      setJoinMsg("✅ Joined! Welcome to the team.");
      fetch(`/api/projects/${id}`).then(r=>r.json()).then(d=>{ if(d.project) setProject(d.project); });
    } else setJoinMsg(`❌ ${d.error}`);
    setJoining(false);
  };
  const handleDelete = async () => {
    if (!confirm("Delete this project?")) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`,{method:"DELETE"});
    if (res.ok) router.push("/projects"); else setDeleting(false);
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const up = await fetch("/api/upload",{method:"POST",body:form});
      const ud = await up.json();
      if (!up.ok) throw new Error(ud.error||"Upload failed");
      await fetch(`/api/projects/${id}/files`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:file.name,url:ud.url,size:file.size,mimeType:file.type})});
      await loadFiles();
    } catch(err) { alert(err instanceof Error?err.message:"Upload failed"); }
    finally { setUploading(false); if(fileInputRef.current) fileInputRef.current.value=""; }
  };
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Remove this file?")) return;
    await fetch(`/api/projects/${id}/files/${fileId}`,{method:"DELETE"});
    setFiles(f=>f.filter(x=>x.id!==fileId));
  };
  const handleNewDiscussion = async () => {
    if (!newDisc.title.trim()||!newDisc.body.trim()) return;
    setSubmittingDisc(true);
    const res = await fetch(`/api/projects/${id}/discussions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newDisc)});
    if (res.ok) { setNewDisc({title:"",body:""}); setShowNewDisc(false); await loadDiscussions(); }
    setSubmittingDisc(false);
  };
  const handleReply = async (discId: string) => {
    if (!replyBody.trim()) return;
    setSubmittingReply(true);
    const res = await fetch(`/api/projects/${id}/discussions/${discId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:replyBody})});
    if (res.ok) {
      const data = await res.json();
      setReplyBody("");
      setDiscussions(prev=>prev.map(d=>d.id===discId?{...d,replies:[...d.replies,data.reply],_count:{replies:d._count.replies+1}}:d));
    }
    setSubmittingReply(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-4">
        {[...Array(4)].map((_,i)=><div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse"/>)}
      </div>
    </div>
  );
  if (error||!project) return (
    <div className="min-h-screen bg-slate-950"><Navbar />
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400 text-lg mb-4">{error||"Project not found"}</p>
        <Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>
      </div>
    </div>
  );

  const mc = project._count.members;
  const isFull = mc >= project.maxMembers;
  const tabs = [
    {key:"about" as const, label:"📋 About"},
    {key:"files" as const, label:"📁 Files"},
    {key:"discussions" as const, label:"💬 Discussions"},
    {key:"members" as const, label:`👥 Members (${mc})`},
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.title}</h1>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${project.visibility==="private"?"bg-rose-900/30 border-rose-700 text-rose-300":"bg-emerald-900/30 border-emerald-700 text-emerald-300"}`}>
                  {project.visibility==="private"?"🔒 Private":"🌎 Public"}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${project.status==="open"?"bg-emerald-900/40 text-emerald-400":"bg-slate-700 text-slate-400"}`}>{project.status}</span>
              </div>
              <p className="text-slate-400 text-sm">
                by <Link href={`/people/${project.createdBy.id}`} className="text-blue-400 hover:underline">{project.createdBy.name}</Link>
                {project.createdBy.university&&` · ${project.createdBy.university}`}
                {" · "}created {timeAgo(project.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner&&<Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-rose-400 border-rose-700 hover:bg-rose-900/20">{deleting?"Deleting…":"Delete"}</Button>}
              {!isOwner&&session&&!isMember&&!isFull&&project.status==="open"&&<Button size="sm" onClick={handleJoin} disabled={joining}>{joining?"Joining…":"Join Project"}</Button>}
              {isMember&&!isOwner&&<span className="text-xs bg-blue-900/40 text-blue-300 border border-blue-700 px-3 py-1.5 rounded-full">✓ Member</span>}
              {isFull&&!isMember&&!isOwner&&<span className="text-xs bg-slate-700 text-slate-400 px-3 py-1.5 rounded-full">Team Full</span>}
            </div>
          </div>
          {joinMsg&&<p className="mt-3 text-sm text-emerald-400">{joinMsg}</p>}
        </div>

        {/* Private guard */}
        {project.visibility==="private"&&!canAccess ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <p className="text-white font-semibold text-lg mb-2">This project is private</p>
            <p className="text-slate-400 text-sm">You need to be a contributor to view files and discussions.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto">
              {tabs.map(t=>(
                <button key={t.key} onClick={()=>setActiveTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${activeTab===t.key?"border-blue-500 text-white":"border-transparent text-slate-400 hover:text-white"}`}>{t.label}</button>
              ))}
            </div>

            {/* ABOUT */}
            {activeTab==="about"&&(
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                    <h2 className="text-white font-semibold text-lg mb-3">About this project</h2>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                  </div>
                  {project.readme&&(
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                      <h2 className="text-white font-semibold text-lg mb-3">📄 README</h2>
                      <pre className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm overflow-x-auto">{project.readme}</pre>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-4">Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Category</span><span className="text-white capitalize">{project.category.replace("-"," ")}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Members</span><span className="text-white">{mc} / {project.maxMembers}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="text-white capitalize">{project.status}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Visibility</span>
                        <span className={project.visibility==="private"?"text-rose-400":"text-emerald-400"}>{project.visibility==="private"?"🔒 Private":"🌎 Public"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Team Capacity</h3>
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width:`${Math.min(100,(mc/project.maxMembers)*100)}%`}}/>
                    </div>
                    <p className="text-xs text-slate-400">{project.maxMembers-mc} spots left</p>
                  </div>
                  {project.skillsNeeded.length>0&&(
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                      <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Skills Needed</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.skillsNeeded.map(s=><span key={s} className="bg-blue-900/40 text-blue-300 border border-blue-800/50 text-xs px-2.5 py-1 rounded-full">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {session&&!isOwner&&(
                    <Link href={`/messages?to=${project.createdBy.id}&name=${encodeURIComponent(project.createdBy.name)}`}>
                      <Button variant="outline" className="w-full">Message Creator</Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* FILES */}
            {activeTab==="files"&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">Project Files</h2>
                  {(isOwner||isMember)&&(
                    <><Button size="sm" onClick={()=>fileInputRef.current?.click()} disabled={uploading}>{uploading?"Uploading…":"+ Upload File"}</Button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}/></>
                  )}
                </div>
                {files.length===0?(
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-3">📂</p><p className="text-slate-400">No files uploaded yet</p>
                    {(isOwner||isMember)&&<p className="text-slate-500 text-sm mt-1">Click "Upload File" to share project files</p>}
                  </div>
                ):(
                  <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
                    {files.map(f=>(
                      <div key={f.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/30 group">
                        <span className="text-xl">{fileIcon(f.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium text-sm truncate block">{f.name}</a>
                          <p className="text-xs text-slate-500">{fmtSize(f.size)} · {f.uploadedBy.name} · {timeAgo(f.createdAt)}</p>
                        </div>
                        {(isOwner||f.uploadedBy.id===session?.user?.id)&&<button onClick={()=>handleDeleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 text-xs transition-opacity">Remove</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DISCUSSIONS */}
            {activeTab==="discussions"&&(
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">Discussions</h2>
                  {session&&<Button size="sm" onClick={()=>setShowNewDisc(!showNewDisc)}>{showNewDisc?"Cancel":"+ New Discussion"}</Button>}
                </div>
                {showNewDisc&&(
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
                    <input type="text" placeholder="Discussion title…" value={newDisc.title}
                      onChange={e=>setNewDisc(p=>({...p,title:e.target.value}))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"/>
                    <textarea placeholder="Share your idea, question, or update…" rows={4} value={newDisc.body}
                      onChange={e=>setNewDisc(p=>({...p,body:e.target.value}))}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm resize-none"/>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleNewDiscussion} disabled={submittingDisc||!newDisc.title.trim()||!newDisc.body.trim()}>
                        {submittingDisc?"Posting…":"Post Discussion"}
                      </Button>
                    </div>
                  </div>
                )}
                {discussions.length===0?(
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <p className="text-4xl mb-3">💬</p><p className="text-slate-400">No discussions yet — start one!</p>
                  </div>
                ):(
                  <div className="space-y-3">
                    {discussions.map(disc=>(
                      <div key={disc.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <button className="w-full flex items-start gap-3 p-5 text-left hover:bg-slate-700/30 transition-colors"
                          onClick={()=>setOpenDiscId(openDiscId===disc.id?null:disc.id)}>
                          <Av user={disc.author} size={8}/>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {disc.pinned&&<span className="text-xs bg-amber-900/40 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full">📌 Pinned</span>}
                              {disc.closed&&<span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">✕ Closed</span>}
                              <span className="font-semibold text-white text-sm">{disc.title}</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">{disc.author.name} · {timeAgo(disc.createdAt)} · {disc._count.replies} {disc._count.replies===1?"reply":"replies"}</p>
                          </div>
                          <span className="text-slate-500 text-xs">{openDiscId===disc.id?"▲":"▼"}</span>
                        </button>
                        {openDiscId===disc.id&&(
                          <div className="border-t border-slate-700">
                            <div className="px-5 py-4 bg-slate-700/20">
                              <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{disc.body}</p>
                            </div>
                            {disc.replies.map(reply=>(
                              <div key={reply.id} className="flex gap-3 px-5 py-4 border-t border-slate-700/50">
                                <Av user={reply.author} size={7}/>
                                <div>
                                  <p className="text-blue-400 text-xs font-medium">{reply.author.name} <span className="text-slate-500 font-normal">· {timeAgo(reply.createdAt)}</span></p>
                                  <p className="text-slate-300 text-sm mt-1 whitespace-pre-wrap">{reply.body}</p>
                                </div>
                              </div>
                            ))}
                            {session&&!disc.closed&&(
                              <div className="flex gap-3 px-5 py-4 border-t border-slate-700/50 bg-slate-700/10">
                                <Av user={{name:session.user?.name??"?", avatar:undefined}} size={7}/>
                                <div className="flex-1 flex gap-2">
                                  <input type="text" placeholder="Write a reply…" value={openDiscId===disc.id?replyBody:""}
                                    onChange={e=>setReplyBody(e.target.value)}
                                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleReply(disc.id);}}}
                                    className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm"/>
                                  <Button size="sm" onClick={()=>handleReply(disc.id)} disabled={submittingReply||!replyBody.trim()}>
                                    {submittingReply?"…":"Reply"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MEMBERS */}
            {activeTab==="members"&&(
              <div className="space-y-3">
                {project.members.map(m=>(
                  <div key={m.id} className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <Av user={m.user} size={10}/>
                    <div className="flex-1 min-w-0">
                      <Link href={`/people/${m.user.id}`} className="text-white font-medium hover:text-blue-400">{m.user.name}</Link>
                      {m.user.university&&<p className="text-slate-400 text-xs mt-0.5">{m.user.university}{m.user.major?` · ${m.user.major}`:""}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${m.role==="creator"?"bg-amber-900/30 border-amber-700 text-amber-300":"bg-blue-900/30 border-blue-700 text-blue-300"}`}>
                        {m.role==="creator"?"👑 Owner":"👤 Member"}
                      </span>
                      {session&&m.user.id!==session.user?.id&&(
                        <Link href={`/messages?to=${m.user.id}&name=${encodeURIComponent(m.user.name)}`}>
                          <Button variant="outline" size="sm">Message</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
