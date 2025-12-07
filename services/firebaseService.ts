import { auth, db as firestore } from "./firebaseConfig";
import {
    collection, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, Timestamp
} from "firebase/firestore";
import {
    signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "firebase/auth";
import { UserProfile, Post, UserRole, Comment, Message, Institution, OnboardingRequest } from '../types';

// Helper to map Firestore docs to objects
const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() } as T);

export const db = {
    // --- Squadran Super Admin ---
    loginSuperAdmin: async (password: string): Promise<boolean> => {
        try {
            // In a real app, super admin should have a specific email
            // For this migration, we assume a fixed super admin email
            await signInWithEmailAndPassword(auth, "superadmin@nexora.com", password);
            // Check role
            if (auth.currentUser) {
                const docRef = doc(firestore, "users", auth.currentUser.uid);
                const snap = await getDoc(docRef);
                if (snap.exists() && snap.data().role === UserRole.SUPER_ADMIN) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error(e);
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

    createInstitution: async (name: string, code: string, logo: string, desc: string, themeColor: string = '#4AA4F2'): Promise<Institution> => {
        const newInstRef = doc(collection(firestore, "institutions"));
        const newInst: Institution = {
            id: newInstRef.id,
            name,
            code,
            logo: logo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
            description: desc,
            themeColor: themeColor
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
    submitOnboardingRequest: async (instituteName: string, email: string, contactName: string): Promise<void> => {
        const ref = doc(collection(firestore, "requests"));
        const req: OnboardingRequest = {
            id: ref.id,
            instituteName,
            email,
            contactName,
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
            randomColor
        );
    },

    // --- Auth ---
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
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const snap = await getDoc(doc(firestore, "users", cred.user.uid));
            if (snap.exists()) {
                const user = snap.data() as UserProfile;
                if (user.role === UserRole.INSTITUTION_ADMIN && user.institutionId === institutionId) {
                    return { user };
                }
            }
            await signOut(auth);
            return { user: null, error: "Access Denied" };
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

    toggleLike: async (postId: string): Promise<void> => {
        // Warning: Not atomic. Real app should use increment() or transaction.
        // For this migration: Read, update.
        const ref = doc(firestore, "posts", postId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const p = snap.data() as Post;
            await updateDoc(ref, { likes: (p.likes || 0) + 1 });
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
