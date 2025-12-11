import { auth, db as firestore } from "./firebaseConfig";
import {
    collection, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, Timestamp
} from "firebase/firestore";
import {
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User,
    GoogleAuthProvider, signInWithPopup, fetchSignInMethodsForEmail
} from "firebase/auth";
import { UserProfile, Post, UserRole, Comment, Message, Institution, OnboardingRequest } from '../types';

// Helper to map Firestore docs to objects
const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export const db = {
    // --- Auth State & Persistence ---
    subscribeToAuth: (callback: (user: UserProfile | null) => void) => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch full profile
                const snap = await getDoc(doc(firestore, "users", firebaseUser.uid));
                if (snap.exists()) {
                    const profile = snap.data() as UserProfile;
                    if (profile.blocked) {
                        await signOut(auth);
                        callback(null);
                    } else {
                        callback(profile);
                    }
                } else {
                    // User might be super admin (not in users collection typically, or handled differently)
                    // But here we rely on users collection. 
                    // If super admin login used a real auth account, we'd need it in Firestore too.
                    // For now, return null if not in 'users'.
                    callback(null);
                }
            } else {
                callback(null);
            }
        });
    },

    logout: async () => {
        await signOut(auth);
    },

    // --- Squadran Super Admin ---
    seedDefaults: async (): Promise<void> => {
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

        for (const inst of DEFAULT_INSTITUTIONS) {
            const ref = doc(firestore, "institutions", inst.id);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                await setDoc(ref, inst);
                // Create welcome post
                const postRef = doc(collection(firestore, "posts"));
                await setDoc(postRef, {
                    id: postRef.id,
                    institutionId: inst.id,
                    authorId: 'system',
                    authorName: `${inst.code} Admin`,
                    authorRole: 'INSTITUTION_ADMIN',
                    title: `Welcome to ${inst.name}`,
                    content: `Welcome to the official ${inst.name} hub.`,
                    timestamp: Date.now(),
                    likes: 0,
                    likedBy: [],
                    comments: [],
                    status: 'VERIFIED',
                    type: 'NEWSLETTER'
                });
            }
        }
    },

    loginSuperAdmin: async (password: string): Promise<boolean> => {
        const EMAIL = "superadmin@nexora.com";
        try {
            await signInWithEmailAndPassword(auth, EMAIL, password);
            // Ensure firestore doc exists
            if (auth.currentUser) {
                await setDoc(doc(firestore, "users", auth.currentUser.uid), {
                    uid: auth.currentUser.uid,
                    email: EMAIL,
                    role: UserRole.SUPER_ADMIN,
                    name: 'Squadran Super Admin',
                    institutionId: 'squadran'
                }, { merge: true });
                return true;
            }
            return true;
        } catch (e: any) {
            console.error("Login failed, attempting creation:", e);
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                try {
                    // Auto-provision on first use if not found
                    const cred = await createUserWithEmailAndPassword(auth, EMAIL, password);
                    await setDoc(doc(firestore, "users", cred.user.uid), {
                        uid: cred.user.uid,
                        email: EMAIL,
                        role: UserRole.SUPER_ADMIN,
                        name: 'Squadran Super Admin',
                        institutionId: 'squadran'
                    });
                    return true;
                } catch (createErr) {
                    console.error("Creation failed:", createErr);
                    return false;
                }
            }
            return false;
        }
    },

    getInstitutions: async (): Promise<Institution[]> => {
        const q = query(collection(firestore, "institutions"));
        const snap = await getDocs(q);
        return snap.docs.map(d => mapDoc<Institution>(d));
    },

    getInstitutionByCode: async (code: string): Promise<Institution | undefined> => {
        // Note: This matches codes exactly. In production, maybe normalize case.
        // We fetch all because we can't do case-insensitive query easily without a normalized field.
        // Or we store a normalized 'codeLower' field.
        // For now, fetch all and find.
        const q = query(collection(firestore, "institutions"));
        const snap = await getDocs(q);
        const insts = snap.docs.map(d => mapDoc<Institution>(d));
        return insts.find(i => i.code.trim().toUpperCase() === code.trim().toUpperCase());
    },

    createInstitution: async (name: string, code: string, logo: string, desc: string, themeColor: string = '#4AA4F2', emailDomain?: string): Promise<Institution> => {
        const newInstRef = doc(collection(firestore, "institutions"));
        const newInst: Institution = {
            id: newInstRef.id,
            name,
            code,
            logo: logo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            description: desc,
            themeColor: themeColor,
            emailDomain: emailDomain
        };
        await setDoc(newInstRef, newInst);

        // Create a welcome post
        const postRef = doc(collection(firestore, "posts"));
        const welcomePost: Post = {
            id: postRef.id,
            institutionId: newInst.id,
            authorId: 'system', // System post
            authorName: `${code} Admin`,
            authorRole: UserRole.INSTITUTION_ADMIN,
            title: `Welcome to ${name}`,
            content: `Welcome to the official ${name} social platform powered by Squadran.`,
            timestamp: Date.now(),
            likes: 0,
            comments: [],
            status: 'VERIFIED',
            type: 'NEWSLETTER'
        };
        await setDoc(postRef, welcomePost);

        // Note: We cannot create the Admin Auth User automatically here without logging out the current user.
        // The Super Admin must manually create the admin account or we need a cloud function.

        return newInst;
    },

    deleteInstitution: async (instId: string): Promise<void> => {
        await deleteDoc(doc(firestore, "institutions", instId));
        // Cleanup users and posts (Optional: Cloud Function better suited)
        // Client-side cleanup is expensive and partial.
        // We will just delete the institution doc for now.
    },

    // Onboarding Requests
    submitOnboardingRequest: async (instituteName: string, email: string, contactName: string, emailDomain?: string): Promise<void> => {
        const ref = doc(collection(firestore, "requests"));
        const req: OnboardingRequest = {
            id: ref.id,
            instituteName,
            email,
            contactName,
            emailDomain,
            status: 'PENDING'
        };
        await setDoc(ref, req);
    },

    getOnboardingRequests: async (): Promise<OnboardingRequest[]> => {
        const q = query(collection(firestore, "requests"), where("status", "==", "PENDING"));
        const snap = await getDocs(q);
        return snap.docs.map(d => mapDoc<OnboardingRequest>(d));
    },

    approveRequest: async (requestId: string): Promise<void> => {
        const ref = doc(firestore, "requests", requestId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        await updateDoc(ref, { status: 'APPROVED' });
        const req = snap.data() as OnboardingRequest;

        // Auto-create the institution
        const colors = ['#FF725E', '#4AA4F2', '#6C63FF', '#43D9AD', '#FFC75F'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        await db.createInstitution(
            req.instituteName,
            req.instituteName.substring(0, 4).toUpperCase(),
            '',
            'Partner Institution',
            randomColor,
            req.emailDomain
        );
    },



    // --- Auth ---

    validateEmailDomain: (email: string, domain?: string): boolean => {
        if (!domain) return true; // No restriction
        // Normalize
        const emailLower = email.toLowerCase();
        const domainLower = domain.toLowerCase();

        // Handle exact domain match (e.g. "@nfsu.ac.in") or generic part (e.g. "nfsu")
        // If domain starts with @, check suffix
        if (domainLower.startsWith('@')) {
            return emailLower.endsWith(domainLower);
        }
        // Else check if email contains the pattern (or stricter: ends with @domain.com or .domain.com)
        // For flexibility as requested: "pattern or standard part"
        return emailLower.includes(domainLower);
    },

    loginWithGoogle: async (institutionId: string, role: UserRole): Promise<{ user: UserProfile | null, error?: string, isNewUser?: boolean }> => {
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            const email = cred.user.email;

            if (!email) {
                await signOut(auth);
                return { user: null, error: "No email provided by Google." };
            }

            // 1. Fetch Institution to check Domain Policy
            const instRef = doc(firestore, "institutions", institutionId);
            const instSnap = await getDoc(instRef);
            if (!instSnap.exists()) {
                await signOut(auth);
                return { user: null, error: "Institution not found." };
            }
            const inst = instSnap.data() as Institution;

            // 2. Validate Domain
            if (!db.validateEmailDomain(email, inst.emailDomain)) {
                await signOut(auth);
                return { user: null, error: `Access Denied: Email must match the domain policy: ${inst.emailDomain}` };
            }

            // 3. User Exists?
            const userRef = doc(firestore, "users", cred.user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const user = userSnap.data() as UserProfile;
                if (user.institutionId !== institutionId) {
                    await signOut(auth);
                    return { user: null, error: "User already registered with another institution." };
                }
                if (user.blocked) {
                    await signOut(auth);
                    return { user: null, error: "User is blocked." };
                }
                return { user, isNewUser: false };
            } else {
                // 4. Create New User
                const newUser: UserProfile = {
                    uid: cred.user.uid,
                    institutionId,
                    name: cred.user.displayName || 'Google User',
                    email: email,
                    role: role,
                    avatar: cred.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(cred.user.displayName || 'User')}`,
                    blocked: false,
                    batch: '2025', // Default
                    bio: 'Joined via Google'
                };
                await setDoc(userRef, newUser);
                return { user: newUser, isNewUser: true };
            }

        } catch (e: any) {
            console.error("Google Login Error", e);
            return { user: null, error: e.message };
        }
    },
    loginStudent: async (email: string, password: string, institutionId: string): Promise<{ user: UserProfile | null, error?: string }> => {
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const snap = await getDoc(doc(firestore, "users", cred.user.uid));
            if (snap.exists()) {
                const user = snap.data() as UserProfile;
                if (user.role === UserRole.STUDENT && user.institutionId === institutionId) {
                    if (user.blocked) { await signOut(auth); return { user: null, error: "Blocked" }; }
                    return { user };
                }
            }
            await signOut(auth);
            return { user: null, error: "Access Denied: Invalid Institution or Role" };
        } catch (e: any) {
            return { user: null, error: e.message };
        }
    },

    loginAlumni: async (email: string, password: string, institutionId: string): Promise<{ user: UserProfile | null, error?: string }> => {
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const snap = await getDoc(doc(firestore, "users", cred.user.uid));
            if (snap.exists()) {
                const user = snap.data() as UserProfile;
                if (user.role === UserRole.ALUMNI && user.institutionId === institutionId) {
                    if (user.blocked) { await signOut(auth); return { user: null, error: "Blocked" }; }
                    return { user };
                }
            }
            await signOut(auth);
            return { user: null, error: "Access Denied" };
        } catch (e: any) {
            return { user: null, error: e.message };
        }
    },

    loginInstAdmin: async (email: string, password: string, institutionId: string): Promise<{ user: UserProfile | null, error?: string }> => {
        if (email !== 'admin@nexora.com') {
            return { user: null, error: "Access Denied: Only Global Admin can access this panel." };
        }
        try {
            // Magic Admin Logic:
            // 1. Try to Login
            let userUid = '';
            try {
                const cred = await signInWithEmailAndPassword(auth, email, password);
                userUid = cred.user.uid;
            } catch (authErr: any) {
                // 2. If not found, auto-create (to simulate default creds experience)
                if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
                    try {
                        const cred = await createUserWithEmailAndPassword(auth, email, password);
                        userUid = cred.user.uid;
                    } catch (createErr: any) {
                        return { user: null, error: "Failed to create Admin account: " + createErr.message };
                    }
                } else {
                    return { user: null, error: authErr.message };
                }
            }

            // 3. Construct Magic Profile (Dynamic Institution ID)
            // We don't save this specific instId to DB permanently because they manage ALL schools.
            // We just return a session user with the requested rights.
            const magicUser: UserProfile = {
                uid: userUid,
                institutionId: institutionId, // Dynamic assignment
                name: 'Institution Admin',
                email: email,
                role: UserRole.INSTITUTION_ADMIN,
                avatar: `https://ui-avatars.com/api/?name=Admin`,
                blocked: false
            };
            return { user: magicUser };

        } catch (e: any) {
            return { user: null, error: e.message };
        }
    },

    signupStudent: async (institutionId: string, name: string, email: string, batch: string, password: string): Promise<UserProfile | null> => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const newUser: UserProfile = {
                uid: cred.user.uid,
                institutionId,
                name,
                email,
                role: UserRole.STUDENT,
                batch,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                bio: 'Student',
                blocked: false
            };
            await setDoc(doc(firestore, "users", newUser.uid), newUser);
            return newUser;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    signupAlumni: async (institutionId: string, name: string, rollNo: string, batch: string, bio: string, email: string, password: string): Promise<UserProfile | null> => {
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const newUser: UserProfile = {
                uid: cred.user.uid,
                institutionId,
                name,
                rollNo,
                email,
                role: UserRole.ALUMNI,
                batch,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                bio: bio || 'Alumni',
                blocked: false
            };
            await setDoc(doc(firestore, "users", newUser.uid), newUser);
            return newUser;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    updateUser: async (uid: string, data: Partial<UserProfile>): Promise<UserProfile | null> => {
        const ref = doc(firestore, "users", uid);
        await updateDoc(ref, data);
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() as UserProfile : null;
    },

    // --- User Mgmt ---
    adminGetAllUsers: async (institutionId: string): Promise<UserProfile[]> => {
        const q = query(
            collection(firestore, "users"),
            where("institutionId", "==", institutionId)
        );
        const snap = await getDocs(q);
        // Filter locally to exclude Admins (or add query filter if possible, but simpler to filter JS)
        return snap.docs.map(d => mapDoc<UserProfile>(d)).filter(u => u.role !== UserRole.INSTITUTION_ADMIN && u.role !== UserRole.SUPER_ADMIN);
    },

    adminDeleteUser: async (uid: string): Promise<void> => {
        await deleteDoc(doc(firestore, "users", uid));
        // Note: Does not delete Auth user.
    },

    adminToggleBlockUser: async (uid: string): Promise<UserProfile | undefined> => {
        const ref = doc(firestore, "users", uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return undefined;

        const user = snap.data() as UserProfile;
        await updateDoc(ref, { blocked: !user.blocked });
        return { ...user, blocked: !user.blocked };
    },

    // Networking
    getAllUsers: async (currentUserId: string, institutionId: string): Promise<UserProfile[]> => {
        const q = query(
            collection(firestore, "users"),
            where("institutionId", "==", institutionId)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => mapDoc<UserProfile>(d))
            .filter(u => u.uid !== currentUserId && u.role !== UserRole.INSTITUTION_ADMIN && !u.blocked);
    },

    getUserById: async (uid: string): Promise<UserProfile | undefined> => {
        const snap = await getDoc(doc(firestore, "users", uid));
        return snap.exists() ? snap.data() as UserProfile : undefined;
    },

    // Posts
    getPosts: async (institutionId: string, type: 'NEWSLETTER' | 'JOB' | 'EVENTS', onlyVerified: boolean = true): Promise<Post[]> => {
        // Basic query
        let q = query(
            collection(firestore, "posts"),
            where("institutionId", "==", institutionId),
            where("type", "==", type)
        );

        if (onlyVerified) {
            q = query(q, where("status", "==", "VERIFIED"));
        }

        // orderBy timestamp is ideal but requires index. We'll sort via JS if needed or try orderBy.
        // q = query(q, orderBy("timestamp", "desc")); 

        const snap = await getDocs(q);
        const posts = snap.docs.map(d => mapDoc<Post>(d));
        return posts.sort((a, b) => b.timestamp - a.timestamp);
    },

    getPendingPosts: async (institutionId: string): Promise<Post[]> => {
        const q = query(
            collection(firestore, "posts"),
            where("institutionId", "==", institutionId),
            where("status", "==", "PENDING")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => mapDoc<Post>(d));
    },

    getUserPosts: async (userId: string): Promise<Post[]> => {
        const q = query(
            collection(firestore, "posts"),
            where("authorId", "==", userId)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => mapDoc<Post>(d)).sort((a, b) => b.timestamp - a.timestamp);
    },

    createPost: async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'status'>): Promise<void> => {
        const ref = doc(collection(firestore, "posts"));
        const newPost: Post = {
            ...post,
            id: ref.id,
            timestamp: Date.now(),
            likes: 0,
            likedBy: [],
            comments: [],
            status: 'PENDING'
        };
        await setDoc(ref, newPost);
    },

    verifyPost: async (postId: string): Promise<void> => {
        await updateDoc(doc(firestore, "posts", postId), { status: 'VERIFIED' });
    },

    deletePost: async (postId: string): Promise<void> => {
        await deleteDoc(doc(firestore, "posts", postId));
    },

    toggleLike: async (postId: string, userId: string): Promise<void> => {
        const ref = doc(firestore, "posts", postId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const p = snap.data() as Post;
            const likedBy = p.likedBy || [];
            const hasLiked = likedBy.includes(userId);

            // Import necessary Firestore functions if not already imported at top
            // For now assuming we just update the whole array for simplicity or use specific fields
            // Better to use field updates
            if (hasLiked) {
                // Unlike
                const newLikedBy = likedBy.filter(id => id !== userId);
                await updateDoc(ref, {
                    likes: Math.max(0, (p.likes || 1) - 1),
                    likedBy: newLikedBy
                });
            } else {
                // Like
                likedBy.push(userId);
                await updateDoc(ref, {
                    likes: (p.likes || 0) + 1,
                    likedBy: likedBy
                });
            }
        }
    },

    addComment: async (postId: string, userId: string, userName: string, text: string): Promise<Comment> => {
        const ref = doc(firestore, "posts", postId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const p = snap.data() as Post;
            const newComment: Comment = {
                id: `c_${Date.now()}`,
                userId,
                userName,
                text,
                timestamp: Date.now(),
                read: false
            };
            const comments = p.comments || [];
            comments.push(newComment);
            await updateDoc(ref, { comments });
            return newComment;
        }
        throw new Error("Post not found");
    },

    // --- Messaging ---
    getMessages: async (currentUserId: string, otherUserId: string): Promise<Message[]> => {
        const q = query(
            collection(firestore, "messages"),
            where("participants", "array-contains", currentUserId)
        );
        // Requires 'participants' field on message to query effectively without complex OR
        // Workaround: We query all messages and filter JS, or we update sendMessage to add 'participants' array.
        // 'participants': [sender, receiver]
        // I will add this logic to sendMessage.

        // For backward compat with existing data? No, we start fresh.

        const snap = await getDocs(q);
        const msgs = snap.docs.map(d => mapDoc<Message>(d));
        return msgs.filter(m =>
            (m.senderId === currentUserId && m.receiverId === otherUserId) ||
            (m.senderId === otherUserId && m.receiverId === currentUserId)
        ).sort((a, b) => a.timestamp - b.timestamp);
    },

    getConversations: async (currentUserId: string): Promise<string[]> => {
        const q = query(
            collection(firestore, "messages"),
            where("participants", "array-contains", currentUserId)
        );
        const snap = await getDocs(q);
        const msgs = snap.docs.map(d => mapDoc<Message>(d));
        const userIds = new Set<string>();
        msgs.forEach(m => {
            if (m.senderId === currentUserId) userIds.add(m.receiverId);
            if (m.receiverId === currentUserId) userIds.add(m.senderId);
        });
        return Array.from(userIds);
    },

    sendMessage: async (senderId: string, receiverId: string, text: string): Promise<void> => {
        const ref = doc(collection(firestore, "messages"));
        const msg: Message & { participants: string[] } = {
            id: ref.id,
            senderId,
            receiverId,
            text,
            timestamp: Date.now(),
            read: false,
            participants: [senderId, receiverId] // Helper for querying
        };
        await setDoc(ref, msg);
    }
};
