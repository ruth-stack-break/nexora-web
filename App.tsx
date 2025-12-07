import React, { useState, useEffect, useRef } from 'react';
import { UserRole, Post, ViewType, UserProfile, Comment, Message, Institution, OnboardingRequest } from './types';
import { db } from './services/firebaseService';
import InstallPWA from './components/InstallPWA';
import {
  GraduationCap, Users, Briefcase, FileText, Bell, Settings, LogOut,
  Home, Plus, Heart, MessageCircle, Share2, CheckCircle, XCircle,
  Search, Trash2, Shield, Building2, Download, Sparkles, Calendar, Edit2, Save, Send, LayoutDashboard, Mail, MessageSquare, UserPlus, Ban, Lock, Unlock, Rocket, Globe, Key, PlusCircle, Palette, ExternalLink, ArrowRight, ChevronRight, Layers, Target, ArrowLeft
} from 'lucide-react';

// --- Constants ---
// Use URL encoding for spaces to prevent 404s on some hosting providers
const SQUADRAN_LOGO_URL = "/logo1.png";


// --- Animation Component ---
const CursorBloop = () => {
  const [bloops, setBloops] = useState<{ x: number, y: number, id: number, color: string }[]>([]);

  useEffect(() => {
    let counter = 0;
    const colors = ['#FF725E', '#4AA4F2', '#6C63FF', '#43D9AD'];

    const handleMouseMove = (e: MouseEvent) => {
      if (Math.random() > 0.8) return;

      const newBloop = {
        x: e.clientX,
        y: e.clientY,
        id: counter++,
        color: colors[Math.floor(Math.random() * colors.length)]
      };

      setBloops(prev => [...prev.slice(-15), newBloop]);

      setTimeout(() => {
        setBloops(prev => prev.filter(b => b.id !== newBloop.id));
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {bloops.map(bloop => (
        <div
          key={bloop.id}
          className="absolute rounded-full animate-ping"
          style={{
            left: bloop.x,
            top: bloop.y,
            width: '10px',
            height: '10px',
            backgroundColor: bloop.color,
            transform: 'translate(-50%, -50%)',
            opacity: 0.6
          }}
        />
      ))}
    </div>
  );
};

// --- Components ---

const PostCard: React.FC<{ post: Post, currentUser: UserProfile, onUpdate: () => void }> = ({ post, currentUser, onUpdate }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const handleLike = async () => {
    await db.toggleLike(post.id);
    setIsLiked(true);
    onUpdate();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await db.addComment(post.id, currentUser.uid, currentUser.name, commentText);
    setCommentText('');
    onUpdate();
  };

  const handleShare = () => {
    const shareText = `${post.title || 'Post'} by ${post.authorName}\n\n${post.content}\n\nShared via Squadran Innovation`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert("Post content copied to clipboard!");
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all mb-6 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center overflow-hidden shadow-sm">
            {/* Use author avatar logic or fallback */}
            <div className="font-bold text-white">{post.authorName[0]}</div>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{post.authorName}</h3>
            <div className="text-xs text-slate-400 font-medium">{post.authorRole} • {new Date(post.timestamp).toLocaleDateString()}</div>
          </div>
        </div>
        <div className="flex gap-2">
          {post.status === 'PENDING' && <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-xs font-bold rounded-full">PENDING</span>}
          {post.type === 'JOB' && <span className="px-3 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-full">JOB</span>}
          {post.type === 'EVENTS' && <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full">EVENT</span>}
        </div>
      </div>

      {post.type !== 'NEWSLETTER' && (
        <div className="mb-3">
          <h4 className="text-xl font-black text-slate-900">{post.title}</h4>
          {post.company && <p className="text-brand-orange font-bold text-sm">{post.company}</p>}
        </div>
      )}

      <p className="text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.jobLink && (
        <a href={post.jobLink} target="_blank" rel="noreferrer" className="inline-block w-full text-center py-3 bg-brand-dark text-white rounded-xl font-bold mb-4 hover:opacity-90">
          Apply Now
        </a>
      )}

      <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
        <button onClick={handleLike} className={`flex items-center gap-2 transition-colors font-bold text-sm group-hover:animate-bounce ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}>
          <Heart size={18} className={post.likes > 0 || isLiked ? "fill-current" : ""} /> {post.likes}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-slate-400 hover:text-brand-blue transition-colors font-bold text-sm">
          <MessageCircle size={18} /> {post.comments.length} Comments
        </button>
        <button onClick={handleShare} className="flex items-center gap-2 text-slate-400 hover:text-brand-orange transition-colors font-bold text-sm ml-auto">
          <Share2 size={18} /> Share
        </button>
      </div>

      {showComments && (
        <div className="mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 -mx-6 px-6 pb-2">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto no-scrollbar">
            {post.comments.length === 0 && <p className="text-xs text-slate-400 italic">No comments yet. Be the first!</p>}
            {post.comments.map(comment => (
              <div key={comment.id} className="bg-white p-3 rounded-xl text-sm shadow-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-slate-700">{comment.userName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-600">{comment.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
            />
            <button onClick={handleComment} className="bg-brand-blue text-white p-2 rounded-lg hover:bg-blue-600"><Send size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

const NetworkingView: React.FC<{ currentUser: UserProfile, institutionId: string, onMessage: (userId: string) => void }> = ({ currentUser, institutionId, onMessage }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'STUDENT' | 'ALUMNI'>('ALL');

  useEffect(() => {
    const loadUsers = async () => {
      const users = await db.getAllUsers(currentUser.uid, institutionId);
      setUsers(users);
    };
    loadUsers();
  }, [currentUser, institutionId]);

  const filteredUsers = users.filter(u => filter === 'ALL' ? true : u.role === filter);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">Network Hub</h1>
          <p className="text-slate-500 font-medium">Connect with peers and alumni.</p>
        </div>
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'ALL' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:bg-slate-50'}`}>All</button>
          <button onClick={() => setFilter('ALUMNI')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'ALUMNI' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Alumni</button>
          <button onClick={() => setFilter('STUDENT')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'STUDENT' ? 'bg-brand-orange text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Students</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {filteredUsers.map(user => (
          <div key={user.uid} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${user.role === 'ALUMNI' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{user.bio || `Batch of ${user.batch}`}</p>

              <div className="flex gap-2 mt-4">
                <button onClick={() => onMessage(user.uid)} className="flex-1 py-2 bg-brand-dark text-white text-xs font-bold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2">
                  <MessageSquare size={14} /> Message
                </button>
                <a href={`mailto:${user.email || ''}`} className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2">
                  <Mail size={14} /> Email
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MessagesView: React.FC<{ currentUser: UserProfile, initialChatId?: string }> = ({ currentUser, initialChatId }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [conversations, setConversations] = useState<string[]>([]);
  const [conversationUsers, setConversationUsers] = useState<Record<string, UserProfile>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update active chat if initialChatId changes (e.g. navigation from profile)
  useEffect(() => {
    if (initialChatId) setActiveChatId(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    const loadConversations = async () => {
      const convs = await db.getConversations(currentUser.uid);
      setConversations(convs);

      const profiles: Record<string, UserProfile> = {};
      for (const uid of convs) {
        const p = await db.getUserById(uid);
        if (p) profiles[uid] = p;
      }
      setConversationUsers(profiles);
    };
    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    // If no active chat but we have conversations, auto-select first one? No, better to let user choose.
    // If we have an active chat, poll for messages
    if (activeChatId) {
      const fetchMessages = async () => {
        const msgs = await db.getMessages(currentUser.uid, activeChatId);
        setMessages(msgs);
      };

      fetchMessages();
      const interval = setInterval(fetchMessages, 1000);
      return () => clearInterval(interval);
    }
  }, [activeChatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChatId) return;
    await db.sendMessage(currentUser.uid, activeChatId, inputText);
    const msgs = await db.getMessages(currentUser.uid, activeChatId);
    setMessages(msgs);
    setInputText('');

    // Refresh conversations list in case this was a new chat
    const convs = await db.getConversations(currentUser.uid);
    setConversations(convs);
  };

  const [activeUser, setActiveUser] = useState<UserProfile | undefined>();

  useEffect(() => {
    if (activeChatId) {
      db.getUserById(activeChatId).then(setActiveUser);
    } else {
      setActiveUser(undefined);
    }
  }, [activeChatId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm h-[80vh] flex overflow-hidden animate-fade-in-up">
      <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-black text-slate-800 text-lg">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && !activeChatId && (
            <div className="p-6 text-center text-slate-400 text-sm">No conversations yet. Start one from the Network Hub.</div>
          )}
          {conversations.map(uid => {
            const user = conversationUsers[uid];
            if (!user) return null;
            return (
              <div
                key={uid}
                onClick={() => setActiveChatId(uid)}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-white transition-colors ${activeChatId === uid ? 'bg-white border-l-4 border-brand-orange shadow-sm' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-white">
        {activeUser ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 shadow-sm z-10">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                <img src={activeUser.avatar} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="font-bold text-slate-800">{activeUser.name}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.senderId === currentUser.uid ? 'bg-brand-blue text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none text-slate-700'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
              <button onClick={handleSend} className="p-3 bg-brand-blue text-white rounded-xl hover:bg-blue-600"><Send size={20} /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <p className="font-bold">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

const UserDashboard: React.FC<{ currentUser: UserProfile, onProfileUpdate: (user: UserProfile) => void }> = ({ currentUser, onProfileUpdate }) => {
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar || '');

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await db.getUserPosts(currentUser.uid);
      setMyPosts(posts);
    };
    loadPosts();
  }, [currentUser]);

  const handleSaveProfile = async () => {
    const updated = await db.updateUser(currentUser.uid, { name: editName, bio: editBio, avatar: editAvatar });
    if (updated) {
      onProfileUpdate(updated);
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 rounded-full bg-slate-100 p-1 border-2 border-brand-orange/20 overflow-hidden">
            <img src={currentUser.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-800">{currentUser.name}</h2>
            <p className="text-brand-orange font-bold uppercase tracking-wide text-sm">{currentUser.role} • {currentUser.batch}</p>
            {currentUser.bio && <p className="text-slate-500 mt-3 text-sm font-medium">{currentUser.bio}</p>}
          </div>
          <button onClick={() => setIsEditing(true)} className="py-2 px-6 bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2">
            <Edit2 size={14} /> Edit Profile
          </button>
        </div>
      </div>

      <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
        <LayoutDashboard size={24} className="text-brand-blue" /> My Activity
      </h3>

      <div className="grid gap-6">
        {myPosts.map(post => (
          <div key={post.id} className="relative opacity-90 hover:opacity-100 transition-opacity">
            <PostCard post={post} currentUser={currentUser} onUpdate={() => db.getUserPosts(currentUser.uid).then(setMyPosts)} />
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black mb-6">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold" placeholder="Name" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Profile Picture URL</label>
                <input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Bio</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="w-full p-3 bg-slate-50 rounded-xl font-medium" placeholder="Bio" />
              </div>
              <button onClick={handleSaveProfile} className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="w-full py-3 text-slate-400 font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC<{ institutionId: string }> = ({ institutionId }) => {
  const [viewMode, setViewMode] = useState<'POSTS' | 'USERS'>('POSTS');
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const loadAdminData = async () => {
      setPendingPosts(await db.getPendingPosts(institutionId));
      setAllUsers(await db.adminGetAllUsers(institutionId));
    };
    loadAdminData();
  }, [institutionId]);

  const handleVerify = async (id: string) => {
    await db.verifyPost(id);
    setPendingPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleReject = async (id: string) => {
    await db.deletePost(id);
    setPendingPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Delete User?")) {
      await db.adminDeleteUser(uid);
      setAllUsers(prev => prev.filter(u => u.uid !== uid));
    }
  };

  const handleToggleBlock = async (uid: string) => {
    const updatedUser = await db.adminToggleBlockUser(uid);
    if (updatedUser) setAllUsers(prev => prev.map(u => u.uid === uid ? updatedUser : u));
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Shield className="text-brand-orange" /> Admin Console</h2>
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
          <button onClick={() => setViewMode('POSTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'POSTS' ? 'bg-brand-dark text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Posts</button>
          <button onClick={() => setViewMode('USERS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${viewMode === 'USERS' ? 'bg-brand-dark text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Users</button>
        </div>
      </div>

      {viewMode === 'POSTS' ? (
        <div className="grid gap-6">
          {pendingPosts.length === 0 && <div className="p-10 text-center text-slate-400 font-bold">No pending posts.</div>}
          {pendingPosts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold">{post.title || 'Untitled Post'}</h4>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.content}</p>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded mt-1 inline-block">{post.type}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleVerify(post.id)} className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl font-bold text-xs">Verify</button>
                <button onClick={() => handleReject(post.id)} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl font-bold text-xs">Reject</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr><th className="p-4 text-xs font-black text-slate-400 uppercase">User</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {allUsers.map(user => (
                <tr key={user.uid} className="border-b border-slate-50">
                  <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                    <img src={user.avatar} className="w-8 h-8 rounded-full" /> {user.name} <span className="text-slate-400 font-normal">({user.role})</span>
                  </td>
                  <td className="p-4 text-right flex gap-2 justify-end">
                    <button onClick={() => handleToggleBlock(user.uid)} className={`p-2 rounded-lg ${user.blocked ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                      {user.blocked ? <Unlock size={16} /> : <Ban size={16} />}
                    </button>
                    <button onClick={() => handleDeleteUser(user.uid)} className="p-2 bg-red-100 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SuperAdminDashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'INSTITUTIONS' | 'REQUESTS'>('INSTITUTIONS');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add New Institution Form
  const [newInstName, setNewInstName] = useState('');
  const [newInstCode, setNewInstCode] = useState('');
  const [newInstColor, setNewInstColor] = useState('#4AA4F2');
  const [newInstLogo, setNewInstLogo] = useState('');

  const refresh = async () => {
    setInstitutions(await db.getInstitutions());
    setRequests(await db.getOnboardingRequests());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleApprove = async (id: string) => {
    await db.approveRequest(id);
    refresh();
  };

  const handleDeboard = async (id: string) => {
    if (window.confirm("CRITICAL ACTION: Are you sure you want to De-board (Delete) this institution? This action is irreversible and will delete all associated data.")) {
      await db.deleteInstitution(id);
      refresh();
    }
  };

  const handleCreateInstitution = async () => {
    if (!newInstName || !newInstCode) return alert("Name and Code are required");
    await db.createInstitution(newInstName, newInstCode, newInstLogo, 'Newly Onboarded Institution', newInstColor);
    setShowAddModal(false);
    setNewInstName(''); setNewInstCode(''); setNewInstColor('#4AA4F2'); setNewInstLogo('');
    refresh();
  };

  return (
    <div className="max-w-6xl mx-auto p-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-center">
            <img src={SQUADRAN_LOGO_URL} alt="Squadran Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800">Squadran Control Center</h1>
            <p className="text-slate-500 mt-2 font-medium">Global Super Admin Dashboard</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
            <button onClick={() => setActiveTab('INSTITUTIONS')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'INSTITUTIONS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>Active Portals</button>
            <button onClick={() => setActiveTab('REQUESTS')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'REQUESTS' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>Requests ({requests.length})</button>
          </div>
          {activeTab === 'INSTITUTIONS' && (
            <button onClick={() => setShowAddModal(true)} className="bg-brand-orange text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-orange-600 transition-colors">
              <PlusCircle size={18} /> Onboard New
            </button>
          )}
          <button onClick={onExit} className="bg-slate-100 text-slate-500 hover:bg-slate-200 px-4 py-2 rounded-xl font-bold text-sm ml-2 flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>
      </div>

      {activeTab === 'REQUESTS' ? (
        <div className="grid gap-4">
          {requests.length === 0 && <div className="text-center p-10 text-slate-400 font-bold bg-white rounded-[2rem] border border-slate-100">No pending partnership requests.</div>}
          {requests.map(req => (
            <div key={req.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h3 className="font-bold text-2xl text-slate-800">{req.instituteName}</h3>
                <p className="text-slate-500 mt-1 font-medium">Request from: <span className="text-slate-800">{req.contactName}</span> ({req.email})</p>
                <div className="mt-2 inline-block px-3 py-1 bg-yellow-50 text-yellow-600 text-xs font-bold rounded-full">PENDING APPROVAL</div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">Ignore</button>
                <button onClick={() => handleApprove(req.id)} className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600">Approve & Onboard</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {institutions.map(inst => (
            <div key={inst.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: inst.themeColor }}></div>

              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-3">
                  <img src={inst.logo} className="w-full h-full object-contain" alt="" />
                </div>
                <div className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full uppercase tracking-wider">{inst.code}</div>
              </div>

              <h3 className="font-black text-xl text-slate-800 mb-2">{inst.name}</h3>
              <p className="text-slate-400 text-sm font-medium line-clamp-2 mb-6">{inst.description}</p>

              <div className="mt-auto flex items-center gap-2 pt-6 border-t border-slate-50">
                <div className="flex-1 text-xs font-bold text-slate-400">
                  Status: <span className="text-emerald-500">Active</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeboard(inst.id); }}
                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  title="De-board Institution"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">Onboard Institution</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><XCircle size={24} className="text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Institute Name</label>
                <input value={newInstName} onChange={e => setNewInstName(e.target.value)} placeholder="e.g. Harvard University" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-slate-200 transition-colors" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Short Code</label>
                  <input value={newInstCode} onChange={e => setNewInstCode(e.target.value)} placeholder="e.g. HARVARD" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-slate-200 transition-colors" />
                </div>
                <div className="w-20">
                  <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Theme</label>
                  <input type="color" value={newInstColor} onChange={e => setNewInstColor(e.target.value)} className="w-full h-[58px] p-1 bg-slate-50 rounded-2xl cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 ml-2 mb-1 block uppercase">Logo URL (Optional)</label>
                <input value={newInstLogo} onChange={e => setNewInstLogo(e.target.value)} placeholder="https://..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-slate-200 transition-colors text-sm" />
              </div>

              <button onClick={handleCreateInstitution} className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl mt-4 flex justify-center items-center gap-2">
                <Rocket size={20} /> Launch Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Replaces SquadranLanding
const UnifiedPortal: React.FC<{ onSelect: (inst: Institution) => void, onSuperAdminLogin: () => void }> = ({ onSelect, onSuperAdminLogin }) => {
  const [code, setCode] = useState('');
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  // Partner Form State
  const [instName, setInstName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');

  // Contact Us Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');

  const handleSubmitRequest = async () => {
    await db.submitOnboardingRequest(instName, email, contactName);
    setShowPartnerForm(false);
    alert("Request Submitted! Our team will contact you shortly.");
  };

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const inst = await db.getInstitutionByCode(code);
    if (inst) {
      onSelect(inst);
    } else {
      alert("Invalid Institution Code. Please check and try again.");
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await db.loginSuperAdmin(adminPwd)) {
      onSuperAdminLogin();
    } else {
      alert("Access Denied: Invalid Root Password");
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Support request sent!\n\nFrom: ${supportName} (${supportEmail})\nSubject: ${supportSubject}\nMessage: ${supportMessage}\n\nOur support team will contact you shortly.`);
    setSupportName('');
    setSupportEmail('');
    setSupportSubject('');
    setSupportMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-x-hidden overflow-y-auto selection:bg-brand-orange selection:text-white">
      <CursorBloop />
      {/* Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-brand-orange/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col p-6 md:p-12 gap-16">

        {/* Top Section: Hero + Login */}
        <div className="grid md:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Column: Vision & Identity */}
          <div className="text-left space-y-8 md:pr-12 animate-fade-in-up">
            <div>
              <img src={SQUADRAN_LOGO_URL} alt="Squadran" className="h-20 w-auto mb-6 object-contain" />
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6 border border-slate-100">
                <Rocket size={16} className="text-brand-orange" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Unified Campus Platform</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight mb-4">
                Squadran <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-blue">Innovation</span>
              </h1>
              <p className="text-2xl font-bold text-slate-600">
                Where Digital Campuses Become Future-Ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wide">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-blue"></div> Empowering Students</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-orange"></div> Enabling Universities</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-800"></div> Connecting Industry</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                  <Globe size={20} className="text-brand-blue" />
                </div>
                <h3 className="font-black text-slate-800 mb-2">Our Vision</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Building Connected, Innovation-First Universities by synchronizing academia with industry demands.
                </p>
              </div>
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                  <Target size={20} className="text-brand-orange" />
                </div>
                <h3 className="font-black text-slate-800 mb-2">Our Mission</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Delivering a Unified, Agile Digital Ecosystem that replaces fragmented apps with one secure environment.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/60">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Product Scope</p>
              <div className="text-lg font-black text-slate-800 flex items-center gap-3">
                <Layers size={20} className="text-slate-400" /> 8 Modular Products <span className="text-slate-300">|</span> 1 Unified Platform
              </div>
            </div>
          </div>

          {/* Right Column: Login Portal */}
          <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">Nexora</h2>
                <p className="text-slate-400 font-bold text-sm">Enter your Institution Code to begin</p>
              </div>

              <form onSubmit={handleEnter} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 ml-2 mb-2 block uppercase">Institution Code</label>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. NFSU, IITD"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-blue/30 focus:bg-white transition-all text-center text-xl uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl flex items-center justify-center gap-2 group transition-all">
                  Enter Campus <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => setShowPartnerForm(true)} className="text-xs font-bold text-brand-blue hover:text-brand-orange transition-colors">
                  New Institution? Partner with us
                </button>
              </div>
            </div>

            <div className="text-center mt-8">
              <button onClick={() => setShowSuperAdminModal(true)} className="text-xs font-bold text-slate-300 hover:text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                <Lock size={12} /> Admin Access
              </button>
            </div>
          </div>
        </div>

        {/* Contact Us Section */}
        <div className="bg-white/80 backdrop-blur-lg rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-slate-100 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-800 mb-2">Contact Support</h2>
              <p className="text-slate-500 font-medium">Run into an issue? We're here to help.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-2 uppercase">Name</label>
                  <input value={supportName} onChange={e => setSupportName(e.target.value)} required placeholder="Your Name" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 ml-2 uppercase">Email</label>
                  <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} required placeholder="Your Email" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-2 uppercase">Subject</label>
                <input value={supportSubject} onChange={e => setSupportSubject(e.target.value)} required placeholder="Brief description of the issue" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 ml-2 uppercase">Message</label>
                <textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} required rows={4} placeholder="Tell us more..." className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none" />
              </div>

              <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2">
                <Mail size={20} /> Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest pb-6">
          Squadran Innovation &copy; 2025
        </div>
      </div>

      {/* Super Admin Modal */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
            <button onClick={() => setShowSuperAdminModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500"><XCircle size={20} /></button>
            <h3 className="text-xl font-black text-slate-800 mb-6 text-center">Super Admin Console</h3>
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <input
                type="password"
                value={adminPwd}
                onChange={e => setAdminPwd(e.target.value)}
                placeholder="Access Code"
                className="w-full p-4 bg-slate-50 rounded-xl font-bold text-center outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button type="submit" className="w-full py-3 bg-brand-orange text-white rounded-xl font-bold shadow-lg hover:bg-orange-600">
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partner Form */}
      {showPartnerForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl relative">
            <button onClick={() => setShowPartnerForm(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full hover:bg-slate-100"><XCircle size={24} /></button>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Join Squadran</h2>
            <p className="text-slate-500 mb-8 font-medium">Digitize your campus in minutes.</p>

            <div className="space-y-4">
              <input value={instName} onChange={e => setInstName(e.target.value)} placeholder="Institution Name" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 focus:border-slate-300 transition-colors" />
              <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Contact Person" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 focus:border-slate-300 transition-colors" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Official Email" className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 focus:border-slate-300 transition-colors" />
              <button onClick={handleSubmitRequest} className="w-full py-4 bg-brand-dark text-white rounded-2xl font-bold hover:bg-slate-800 shadow-xl mt-2">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentInstitution, setCurrentInstitution] = useState<Institution | null>(null);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.NEWSLETTER);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);

  // Auth State
  const [loginTab, setLoginTab] = useState<'STUDENT' | 'ALUMNI' | 'ADMIN'>('STUDENT');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBatch, setRegBatch] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regBio, setRegBio] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);

  const refreshPosts = async () => {
    if (!currentInstitution) return;
    if (currentView === ViewType.NEWSLETTER) setPosts(await db.getPosts(currentInstitution.id, 'NEWSLETTER'));
    else if (currentView === ViewType.JOB_PORTAL) setPosts(await db.getPosts(currentInstitution.id, 'JOB'));
    else if (currentView === ViewType.EVENTS) setPosts(await db.getPosts(currentInstitution.id, 'EVENTS'));
  };

  useEffect(() => {
    refreshPosts();
  }, [currentView, currentUser, currentInstitution]);

  const handleLogin = async () => {
    if (!currentInstitution) return;
    let result: { user: UserProfile | null, error?: string } = { user: null };

    if (loginTab === 'ADMIN') {
      result = await db.loginInstAdmin(loginInput, password, currentInstitution.id);
    } else if (loginTab === 'STUDENT') {
      result = await db.loginStudent(loginInput, password, currentInstitution.id);
    } else {
      result = await db.loginAlumni(loginInput, password, currentInstitution.id);
    }

    if (result.error) {
      alert(result.error);
    } else if (result.user) {
      setCurrentUser(result.user);
      setCurrentView(result.user.role === UserRole.INSTITUTION_ADMIN ? ViewType.ADMIN_DASHBOARD : ViewType.NEWSLETTER);
    } else {
      alert(`Invalid Credentials for ${currentInstitution.name}!`);
    }
  };

  const handleSignup = async () => {
    if (!currentInstitution || !regName || !regBatch) return alert("Fill all fields");

    let user: UserProfile | null = null;
    if (loginTab === 'STUDENT') {
      if (!regEmail) return alert("Email Required");
      user = await db.signupStudent(currentInstitution.id, regName, regEmail, regBatch, password);
    } else if (loginTab === 'ALUMNI') {
      if (!regRoll) return alert("Roll No Required");
      if (!regEmail) return alert("Email Required");
      user = await db.signupAlumni(currentInstitution.id, regName, regRoll, regBatch, regBio, regEmail, password);
    } else {
      return alert("Admins cannot self-register. Contact Squadran Super Admin.");
    }

    if (user) {
      setCurrentUser(user);
      setCurrentView(ViewType.NEWSLETTER);
      alert(`Welcome to ${currentInstitution.name}!`);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentInstitution) return;
    const form = e.target as HTMLFormElement;
    const content = (form.elements.namedItem('content') as HTMLTextAreaElement).value;

    let type: any = 'NEWSLETTER';
    if (currentView === ViewType.JOB_PORTAL) type = 'JOB';
    if (currentView === ViewType.EVENTS) type = 'EVENTS';

    let jobData = {};
    if (type === 'JOB') {
      jobData = {
        title: (form.elements.namedItem('title') as HTMLInputElement).value,
        company: (form.elements.namedItem('company') as HTMLInputElement).value,
        jobLink: (form.elements.namedItem('link') as HTMLInputElement).value
      };
    } else if (type === 'EVENTS') {
      jobData = {
        title: (form.elements.namedItem('title') as HTMLInputElement).value,
      };
    } else {
      // Newsletter
      jobData = {
        title: (form.elements.namedItem('title') as HTMLInputElement).value,
      };
    }

    await db.createPost({
      institutionId: currentInstitution.id,
      authorId: currentUser.uid,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content,
      type,
      ...jobData
    });

    setShowCreateModal(false);
    refreshPosts();
    alert("Post submitted for verification!");
  };

  const handleBackToHome = () => {
    if (currentUser) {
      if (window.confirm("Return to Home Page? You will be logged out.")) {
        setCurrentUser(null);
        setCurrentInstitution(null);
      }
    } else {
      setCurrentInstitution(null);
    }
  };

  // --- SUPER ADMIN DASHBOARD ---
  // Priority 1: Check if in Super Admin Mode
  if (isSuperAdminMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-brand-dark text-white p-6 flex justify-between items-center sticky top-0 z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <img src={SQUADRAN_LOGO_URL} alt="Admin Logo" className="w-8 h-8 object-contain" />
            <h1 className="font-bold text-xl">Squadran Innovation</h1>
          </div>
          {/* Navigation inside Dashboard Component */}
        </header>
        <SuperAdminDashboard onExit={() => setIsSuperAdminMode(false)} />
      </div>
    );
  }

  // --- UNIFIED LANDING (Step 1) ---
  // Priority 2: If no institution selected, show Unified Portal
  if (!currentInstitution) {
    return (
      <>
        <UnifiedPortal
          onSelect={(inst) => setCurrentInstitution(inst)}
          onSuperAdminLogin={() => setIsSuperAdminMode(true)}
        />
        <InstallPWA />
      </>
    );
  }

  // --- INSTITUTION LOGIN (Step 2) ---
  // Priority 3: Institution selected but not logged in
  if (currentInstitution && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
        <CursorBloop />
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 z-10 relative">

          <div className="p-10 text-center relative overflow-hidden" style={{ backgroundColor: currentInstitution.themeColor }}>
            <div className="relative z-10 text-white mt-8">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
                <img src={currentInstitution.logo} className="w-full h-full object-contain" alt="" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-1">Squadran Innovation</h1>
              {/* Fixed Name: Standardized Branding */}
              <div className="text-sm font-bold opacity-80 mt-1 uppercase tracking-wider">Nexora</div>
            </div>
          </div>

          <div className="p-8">
            {/* Role Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button onClick={() => setLoginTab('STUDENT')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${loginTab === 'STUDENT' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Student</button>
              <button onClick={() => setLoginTab('ALUMNI')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${loginTab === 'ALUMNI' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Alumni</button>
              <button onClick={() => setLoginTab('ADMIN')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${loginTab === 'ADMIN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Admin</button>
            </div>

            <div className="space-y-4">
              {isRegistering && loginTab !== 'ADMIN' ? (
                <>
                  <input value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Full Name" />
                  <input value={regBatch} onChange={e => setRegBatch(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Batch Year" />
                  {loginTab === 'STUDENT' ? (
                    <input value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Institute Email" />
                  ) : (
                    <>
                      <input value={regRoll} onChange={e => setRegRoll(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Roll No / ID" />
                      <input value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Email" />
                      <textarea value={regBio} onChange={e => setRegBio(e.target.value)} rows={2} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-medium" placeholder="Current Role / Bio" />
                    </>
                  )}
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-slate-50 rounded-2xl outline-none font-bold" placeholder="Create Password" />
                  <button onClick={handleSignup} className="w-full py-4 text-white rounded-2xl font-bold transition-all mt-2 shadow-lg" style={{ backgroundColor: currentInstitution.themeColor }}>Join {currentInstitution.code}</button>
                </>
              ) : (
                <>
                  {loginTab === 'ADMIN' ? (
                    <div className="bg-orange-50 p-4 rounded-xl text-xs text-orange-600 font-bold mb-2">
                      <Key size={14} className="inline mr-1" /> Default: "admin@nexora.com" / "admin"
                    </div>
                  ) : null}

                  <input value={loginInput} onChange={(e) => setLoginInput(e.target.value)} placeholder={loginTab === 'ADMIN' ? 'Admin Email' : 'Email ID'} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 font-bold text-slate-700" style={{ '--tw-ring-color': currentInstitution.themeColor } as React.CSSProperties} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 font-bold text-slate-700" style={{ '--tw-ring-color': currentInstitution.themeColor } as React.CSSProperties} />

                  <button onClick={handleLogin} className="w-full py-4 text-white rounded-2xl font-bold transition-all shadow-lg" style={{ backgroundColor: currentInstitution.themeColor }}>Login</button>
                </>
              )}
            </div>

            {loginTab !== 'ADMIN' && (
              <div className="text-center mt-6">
                <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-bold hover:underline" style={{ color: currentInstitution.themeColor }}>
                  {isRegistering ? 'Back to Login' : 'Create Account'}
                </button>
              </div>
            )}

            <div className="text-center mt-4">
              <button onClick={handleBackToHome} className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                <ArrowLeft size={14} /> Back to All Institutions
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 flex items-center gap-2 opacity-50">
          <img src={SQUADRAN_LOGO_URL} className="w-5 h-5 object-contain" />
          <span className="text-xs font-bold text-slate-400">Powered by Squadran</span>
        </div>
      </div>
    );
  }

  // --- MAIN INSTITUTION APP ---
  // Priority 4: Authenticated User
  if (currentInstitution && currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        <CursorBloop />
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-100 flex-col h-screen sticky top-0 z-20">
          <div className="p-8">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <img src={SQUADRAN_LOGO_URL} className="w-8 h-8 object-contain" /> Squadran Innovation
            </h2>
            <p className="text-xs font-bold text-slate-400 mt-1 pl-11">{currentInstitution.code} Campus</p>
          </div>
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
            <button onClick={() => setCurrentView(ViewType.NEWSLETTER)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.NEWSLETTER ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Home size={20} /> Feed</button>
            <button onClick={() => setCurrentView(ViewType.JOB_PORTAL)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.JOB_PORTAL ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Briefcase size={20} /> Jobs</button>
            <button onClick={() => setCurrentView(ViewType.EVENTS)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.EVENTS ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={20} /> Events</button>

            {currentUser.role !== UserRole.INSTITUTION_ADMIN && (
              <>
                <div className="pt-4 pb-2 pl-4 text-xs font-bold text-slate-400 uppercase">Connect</div>
                <button onClick={() => setCurrentView(ViewType.NETWORKING)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.NETWORKING ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><Users size={20} /> Network</button>
                <button onClick={() => setCurrentView(ViewType.MESSAGES)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.MESSAGES ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><MessageSquare size={20} /> Messages</button>
              </>
            )}

            <div className="pt-4 pb-2 pl-4 text-xs font-bold text-slate-400 uppercase">Account</div>
            <button onClick={() => setCurrentView(currentUser.role === UserRole.INSTITUTION_ADMIN ? ViewType.ADMIN_DASHBOARD : ViewType.USER_DASHBOARD)} className={`w-full flex items-center gap-3 p-4 rounded-xl font-bold transition-colors ${currentView === ViewType.ADMIN_DASHBOARD || currentView === ViewType.USER_DASHBOARD ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>

            <button onClick={handleBackToHome} className="w-full flex items-center gap-3 p-4 rounded-xl font-bold text-slate-400 hover:text-brand-orange hover:bg-slate-50 transition-colors mt-4">
              <ArrowLeft size={20} /> Back to Home
            </button>
          </nav>
          <div className="p-6 border-t border-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden"><img src={currentUser.avatar} className="w-full h-full object-cover" /></div>
              <div><div className="text-sm font-bold text-slate-800">{currentUser.name}</div><div className="text-xs text-slate-400 font-bold">{currentUser.role}</div></div>
            </div>
            <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-sm"><LogOut size={16} /> Logout</button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto z-10">
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-6">
            <div className="font-black text-xl text-slate-800 flex items-center gap-2">
              <img src={SQUADRAN_LOGO_URL} className="w-6 h-6 object-contain" /> Squadran Innovation
            </div>
            <button onClick={() => setCurrentUser(null)}><LogOut size={20} className="text-slate-400" /></button>
          </div>

          {currentView === ViewType.ADMIN_DASHBOARD ? (
            <AdminDashboard institutionId={currentInstitution.id} />
          ) : currentView === ViewType.USER_DASHBOARD ? (
            <UserDashboard currentUser={currentUser} onProfileUpdate={setCurrentUser} />
          ) : currentView === ViewType.NETWORKING ? (
            <NetworkingView
              currentUser={currentUser}
              institutionId={currentInstitution.id}
              onMessage={(uid) => {
                setSelectedChatUser(uid); // Update state in App
                setCurrentView(ViewType.MESSAGES); // Switch view
              }}
            />
          ) : currentView === ViewType.MESSAGES ? (
            <MessagesView currentUser={currentUser} initialChatId={selectedChatUser || undefined} />
          ) : (
            <div className="max-w-2xl mx-auto">
              <header className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 mb-1" style={{ color: currentInstitution.themeColor }}>
                    Squadran Innovation
                  </h1>
                  <p className="text-slate-400 font-bold text-sm">{currentView === ViewType.NEWSLETTER ? 'News Feed' : currentView === ViewType.JOB_PORTAL ? 'Career Portal' : 'Campus Events'}</p>
                </div>
                {(currentView === ViewType.NEWSLETTER || currentView === ViewType.JOB_PORTAL || currentView === ViewType.EVENTS) && (
                  <button onClick={() => setShowCreateModal(true)} className="text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-transform hover:scale-105 shadow-lg" style={{ backgroundColor: currentInstitution.themeColor }}>
                    <Plus size={20} /> Post
                  </button>
                )}
              </header>

              <div className="animate-fade-in-up">
                {posts.length === 0 ? <div className="text-center py-20 opacity-50"><Search size={48} className="mx-auto mb-4 text-slate-300" /><p className="font-bold text-slate-400">No content yet.</p></div> : posts.map(post => <PostCard key={post.id} post={post} currentUser={currentUser} onUpdate={refreshPosts} />)}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-around z-30">
          <button onClick={() => setCurrentView(ViewType.NEWSLETTER)} className="p-2 rounded-xl text-slate-400"><Home size={24} /></button>
          <button onClick={() => setCurrentView(ViewType.JOB_PORTAL)} className="p-2 rounded-xl text-slate-400"><Briefcase size={24} /></button>
          {currentUser.role !== UserRole.INSTITUTION_ADMIN && <button onClick={() => setCurrentView(ViewType.MESSAGES)} className="p-2 rounded-xl text-slate-400"><MessageSquare size={24} /></button>}
          <button onClick={() => setCurrentView(currentUser.role === UserRole.INSTITUTION_ADMIN ? ViewType.ADMIN_DASHBOARD : ViewType.USER_DASHBOARD)} className="p-2 rounded-xl text-slate-400"><LayoutDashboard size={24} /></button>
          <button onClick={handleBackToHome} className="p-2 rounded-xl text-slate-400"><ArrowLeft size={24} /></button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800">Create Post</h3><button onClick={() => setShowCreateModal(false)}><XCircle className="text-slate-400 hover:text-red-500" /></button></div>
              <form onSubmit={handleCreatePost} className="space-y-4">
                {currentView === ViewType.JOB_PORTAL && <><input name="title" required placeholder="Job Title" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" /><input name="company" required placeholder="Company" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" /><input name="link" placeholder="Apply Link" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" /></>}
                {(currentView === ViewType.NEWSLETTER || currentView === ViewType.EVENTS) && <input name="title" required placeholder={currentView === ViewType.EVENTS ? "Event Name" : "Post Title"} className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none" />}
                <textarea name="content" required rows={5} placeholder="Content..." className="w-full p-4 bg-slate-50 rounded-xl font-medium outline-none resize-none"></textarea>
                <button type="submit" className="w-full py-3 text-white rounded-xl font-bold hover:opacity-90" style={{ backgroundColor: currentInstitution.themeColor }}>Submit</button>
              </form>
            </div>
          </div>
        )}

        {/* PWA Install Popup */}
        <InstallPWA />


      </div>
    );
  }

  return <div>Loading...</div>;
};

export default App;
