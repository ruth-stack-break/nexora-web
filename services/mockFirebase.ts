import { UserProfile, Post, UserRole, Comment, Message, Institution, OnboardingRequest } from '../types';

// --- Local Storage Helpers ---
const STORAGE_KEYS = {
  INSTITUTIONS: 'squadran_institutions',
  USERS: 'squadran_users',
  POSTS: 'squadran_posts',
  MESSAGES: 'squadran_messages',
  REQUESTS: 'squadran_requests'
};

const loadData = <T>(key: string, defaults: T[]): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  } catch (e) {
    console.error("Storage Load Error", e);
    return defaults;
  }
};

const saveData = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Storage Save Error", e);
  }
};

// --- Default Data (Used only on first load) ---

const DEFAULT_INSTITUTIONS: Institution[] = [
  {
    id: 'inst_nfsu',
    name: 'NFSU Social',
    code: 'NFSU',
    logo: 'https://cdn-icons-png.flaticon.com/512/3413/3413535.png',
    description: 'National Forensic Sciences University',
    themeColor: '#FF725E'
  },
  {
    id: 'inst_iit',
    name: 'IIT Delhi Connect',
    code: 'IITD',
    logo: 'https://cdn-icons-png.flaticon.com/512/2997/2997274.png',
    description: 'Indian Institute of Technology Delhi',
    themeColor: '#6C63FF'
  }
];

const DEFAULT_USERS: UserProfile[] = [
  {
    uid: 'super_admin',
    institutionId: 'squadran',
    name: 'Squadran CEO',
    role: UserRole.SUPER_ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=CEO',
    blocked: false
  },
  {
    uid: 'student_01',
    institutionId: 'inst_nfsu',
    name: 'Rohan Sharma',
    email: 'rohan@nfsu.ac.in',
    role: UserRole.STUDENT,
    batch: '2023-2025',
    avatar: 'https://picsum.photos/seed/student1/200',
    bio: 'Aspiring Cyber Security Analyst.',
    blocked: false
  },
  {
    uid: 'admin_nfsu',
    institutionId: 'inst_nfsu',
    name: 'NFSU Admin',
    role: UserRole.INSTITUTION_ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin',
    blocked: false
  },
  {
    uid: 'student_iit_1',
    institutionId: 'inst_iit',
    name: 'Vikram Singh',
    email: 'vikram@iitd.ac.in',
    role: UserRole.STUDENT,
    batch: '2022-2026',
    avatar: 'https://picsum.photos/seed/iit1/200',
    bio: 'CS Undergrad.',
    blocked: false
  },
  {
    uid: 'admin_iit',
    institutionId: 'inst_iit',
    name: 'IIT Admin',
    role: UserRole.INSTITUTION_ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin',
    blocked: false
  }
];

const DEFAULT_POSTS: Post[] = [
  {
    id: 'post_nfsu_1',
    institutionId: 'inst_nfsu',
    authorId: 'admin_nfsu',
    authorName: 'NFSU Admin',
    authorRole: UserRole.INSTITUTION_ADMIN,
    title: 'Forensic Conf 2025',
    content: 'Join us for the conference.',
    timestamp: Date.now() - 100000,
    likes: 150,
    comments: [],
    status: 'VERIFIED',
    type: 'EVENTS'
  },
  {
    id: 'post_iit_1',
    institutionId: 'inst_iit',
    authorId: 'student_iit_1',
    authorName: 'Vikram Singh',
    authorRole: UserRole.STUDENT,
    content: 'Robotics club meet at 5 PM.',
    timestamp: Date.now() - 50000,
    likes: 20,
    comments: [],
    status: 'VERIFIED',
    type: 'NEWSLETTER'
  }
];

const DEFAULT_REQUESTS: OnboardingRequest[] = [
  {
    id: 'req_demo_1',
    instituteName: 'Stanford University',
    email: 'admin@stanford.edu',
    contactName: 'John Dean',
    status: 'PENDING'
  }
];

// --- Service Methods ---

export const db = {
  // --- Squadran Super Admin ---
  loginSuperAdmin: (password: string): boolean => {
    return password === 'squadran_root';
  },

  getInstitutions: (): Institution[] => {
    return loadData(STORAGE_KEYS.INSTITUTIONS, DEFAULT_INSTITUTIONS);
  },

  getInstitutionByCode: (code: string): Institution | undefined => {
    const insts = loadData<Institution>(STORAGE_KEYS.INSTITUTIONS, DEFAULT_INSTITUTIONS);
    return insts.find(i => i.code.trim().toUpperCase() === code.trim().toUpperCase());
  },

  createInstitution: (name: string, code: string, logo: string, desc: string, themeColor: string = '#4AA4F2'): Institution => {
    const insts = loadData<Institution>(STORAGE_KEYS.INSTITUTIONS, DEFAULT_INSTITUTIONS);
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);

    const newInst: Institution = {
      id: `inst_${Date.now()}`,
      name,
      code,
      logo: logo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
      description: desc,
      themeColor: themeColor
    };
    insts.push(newInst);
    
    // Create a default admin for this institution automatically
    const adminId = `admin_${newInst.id}`;
    users.push({
      uid: adminId,
      institutionId: newInst.id,
      name: `${code} Admin`,
      role: UserRole.INSTITUTION_ADMIN,
      avatar: `https://ui-avatars.com/api/?name=${code}+Admin`,
      blocked: false
    });

    // Create a welcome post
    posts.unshift({
      id: `post_${Date.now()}`,
      institutionId: newInst.id,
      authorId: adminId,
      authorName: `${code} Admin`,
      authorRole: UserRole.INSTITUTION_ADMIN,
      title: `Welcome to ${name}`,
      content: `Welcome to the official ${name} social platform powered by Squadran.`,
      timestamp: Date.now(),
      likes: 0,
      comments: [],
      status: 'VERIFIED',
      type: 'NEWSLETTER'
    });

    saveData(STORAGE_KEYS.INSTITUTIONS, insts);
    saveData(STORAGE_KEYS.USERS, users);
    saveData(STORAGE_KEYS.POSTS, posts);

    return newInst;
  },

  deleteInstitution: (instId: string): void => {
    let insts = loadData<Institution>(STORAGE_KEYS.INSTITUTIONS, DEFAULT_INSTITUTIONS);
    let users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    let posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);

    insts = insts.filter(i => i.id !== instId);
    users = users.filter(u => u.institutionId !== instId);
    posts = posts.filter(p => p.institutionId !== instId);

    saveData(STORAGE_KEYS.INSTITUTIONS, insts);
    saveData(STORAGE_KEYS.USERS, users);
    saveData(STORAGE_KEYS.POSTS, posts);
  },

  // Onboarding Requests
  submitOnboardingRequest: (instituteName: string, email: string, contactName: string): void => {
    const reqs = loadData<OnboardingRequest>(STORAGE_KEYS.REQUESTS, DEFAULT_REQUESTS);
    reqs.push({
      id: `req_${Date.now()}`,
      instituteName,
      email,
      contactName,
      status: 'PENDING'
    });
    saveData(STORAGE_KEYS.REQUESTS, reqs);
  },

  getOnboardingRequests: (): OnboardingRequest[] => {
    const reqs = loadData<OnboardingRequest>(STORAGE_KEYS.REQUESTS, DEFAULT_REQUESTS);
    return reqs.filter(r => r.status === 'PENDING');
  },

  approveRequest: (requestId: string): void => {
    const reqs = loadData<OnboardingRequest>(STORAGE_KEYS.REQUESTS, DEFAULT_REQUESTS);
    const req = reqs.find(r => r.id === requestId);
    if (req) {
      req.status = 'APPROVED';
      saveData(STORAGE_KEYS.REQUESTS, reqs);
      
      // Auto-create the institution
      const colors = ['#FF725E', '#4AA4F2', '#6C63FF', '#43D9AD', '#FFC75F'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      db.createInstitution(
        req.instituteName, 
        req.instituteName.substring(0, 4).toUpperCase(), 
        '', 
        'Partner Institution', 
        randomColor
      );
    }
  },

  // --- Auth ---
  loginStudent: (email: string, institutionId: string): { user: UserProfile | null, error?: string } => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const user = users.find(u => u.role === UserRole.STUDENT && u.email === email && u.institutionId === institutionId);
    if (user) {
      if (user.blocked) return { user: null, error: "Access Denied: Blocked." };
      return { user };
    }
    return { user: null };
  },

  loginAlumni: (rollNo: string, institutionId: string): { user: UserProfile | null, error?: string } => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const user = users.find(u => u.role === UserRole.ALUMNI && u.rollNo === rollNo && u.institutionId === institutionId);
    if (user) {
      if (user.blocked) return { user: null, error: "Access Denied: Blocked." };
      return { user };
    }
    return { user: null };
  },

  loginInstAdmin: (password: string, institutionId: string): { user: UserProfile | null, error?: string } => {
     const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
     if (password === 'admin') {
         const user = users.find(u => u.role === UserRole.INSTITUTION_ADMIN && u.institutionId === institutionId);
         if (user) return { user };
         return { user: null, error: "Admin account configuration error." };
     }
     return { user: null, error: "Invalid Admin Credentials" };
  },

  signupStudent: (institutionId: string, name: string, email: string, batch: string): UserProfile => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const newUser: UserProfile = {
      uid: `student_${Date.now()}`,
      institutionId,
      name,
      email,
      role: UserRole.STUDENT,
      batch,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      bio: 'Student',
      blocked: false
    };
    users.push(newUser);
    saveData(STORAGE_KEYS.USERS, users);
    return newUser;
  },

  signupAlumni: (institutionId: string, name: string, rollNo: string, batch: string, bio: string): UserProfile => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const newUser: UserProfile = {
      uid: `alumni_${Date.now()}`,
      institutionId,
      name,
      rollNo,
      role: UserRole.ALUMNI,
      batch,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
      bio: bio || 'Alumni',
      blocked: false
    };
    users.push(newUser);
    saveData(STORAGE_KEYS.USERS, users);
    return newUser;
  },

  updateUser: (uid: string, data: Partial<UserProfile>): UserProfile | null => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const index = users.findIndex(u => u.uid === uid);
    if (index !== -1) {
      users[index] = { ...users[index], ...data };
      saveData(STORAGE_KEYS.USERS, users);
      return users[index];
    }
    return null;
  },

  // --- User Mgmt ---
  adminGetAllUsers: (institutionId: string): UserProfile[] => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    return users.filter(u => u.institutionId === institutionId && u.role !== UserRole.INSTITUTION_ADMIN && u.role !== UserRole.SUPER_ADMIN);
  },

  adminDeleteUser: (uid: string): void => {
    let users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    users = users.filter(u => u.uid !== uid);
    saveData(STORAGE_KEYS.USERS, users);
  },

  adminToggleBlockUser: (uid: string): UserProfile | undefined => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const user = users.find(u => u.uid === uid);
    if (user) {
      user.blocked = !user.blocked;
      saveData(STORAGE_KEYS.USERS, users);
      return user;
    }
    return undefined;
  },

  // Networking
  getAllUsers: (currentUserId: string, institutionId: string): UserProfile[] => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    return users.filter(u => 
      u.institutionId === institutionId && 
      u.uid !== currentUserId && 
      u.role !== UserRole.INSTITUTION_ADMIN && 
      !u.blocked
    );
  },

  getUserById: (uid: string): UserProfile | undefined => {
    const users = loadData<UserProfile>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    return users.find(u => u.uid === uid);
  },

  // Posts
  getPosts: (institutionId: string, type: 'NEWSLETTER' | 'JOB' | 'EVENTS', onlyVerified: boolean = true): Post[] => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    return posts.filter(p => {
      const instMatch = p.institutionId === institutionId;
      const typeMatch = p.type === type;
      const statusMatch = onlyVerified ? p.status === 'VERIFIED' : true;
      return instMatch && typeMatch && statusMatch;
    }).sort((a, b) => b.timestamp - a.timestamp);
  },

  getPendingPosts: (institutionId: string): Post[] => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    return posts.filter(p => p.institutionId === institutionId && p.status === 'PENDING');
  },

  getUserPosts: (userId: string): Post[] => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    return posts.filter(p => p.authorId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },

  createPost: (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'status'>): void => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    const newPost: Post = {
      ...post,
      id: `post_${Date.now()}`,
      timestamp: Date.now(),
      likes: 0,
      comments: [],
      status: 'PENDING'
    };
    posts.unshift(newPost);
    saveData(STORAGE_KEYS.POSTS, posts);
  },

  verifyPost: (postId: string): void => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.status = 'VERIFIED';
      saveData(STORAGE_KEYS.POSTS, posts);
    }
  },

  deletePost: (postId: string): void => {
    let posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    posts = posts.filter(p => p.id !== postId);
    saveData(STORAGE_KEYS.POSTS, posts);
  },

  toggleLike: (postId: string): void => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.likes += 1;
      saveData(STORAGE_KEYS.POSTS, posts);
    }
  },

  addComment: (postId: string, userId: string, userName: string, text: string): Comment => {
    const posts = loadData<Post>(STORAGE_KEYS.POSTS, DEFAULT_POSTS);
    const post = posts.find(p => p.id === postId);
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId,
      userName,
      text,
      timestamp: Date.now(),
      read: false
    };
    if (post) {
      post.comments.push(newComment);
      saveData(STORAGE_KEYS.POSTS, posts);
    }
    return newComment;
  },

  // --- Messaging (LocalStorage Persistent) ---
  getMessages: (currentUserId: string, otherUserId: string): Message[] => {
    const messages = loadData<Message>(STORAGE_KEYS.MESSAGES, []);
    return messages.filter(m => 
      (m.senderId === currentUserId && m.receiverId === otherUserId) ||
      (m.senderId === otherUserId && m.receiverId === currentUserId)
    ).sort((a, b) => a.timestamp - b.timestamp);
  },

  getConversations: (currentUserId: string): string[] => {
    const messages = loadData<Message>(STORAGE_KEYS.MESSAGES, []);
    const userIds = new Set<string>();
    messages.forEach(m => {
      if (m.senderId === currentUserId) userIds.add(m.receiverId);
      if (m.receiverId === currentUserId) userIds.add(m.senderId);
    });
    return Array.from(userIds);
  },

  sendMessage: (senderId: string, receiverId: string, text: string): void => {
    const messages = loadData<Message>(STORAGE_KEYS.MESSAGES, []);
    messages.push({
      id: `m_${Date.now()}`,
      senderId,
      receiverId,
      text,
      timestamp: Date.now(),
      read: false
    });
    saveData(STORAGE_KEYS.MESSAGES, messages);
  }
};