export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Squadran Owner
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN', // School Admin
  STUDENT = 'STUDENT',
  ALUMNI = 'ALUMNI',
  NONE = 'NONE'
}

export enum ViewType {
  SQUADRAN_HOME = 'SQUADRAN_HOME',
  SUPER_ADMIN_DASHBOARD = 'SUPER_ADMIN_DASHBOARD',
  NEWSLETTER = 'NEWSLETTER',
  JOB_PORTAL = 'JOB_PORTAL',
  EVENTS = 'EVENTS',
  NETWORKING = 'NETWORKING',
  MESSAGES = 'MESSAGES',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD', // Institution Level Admin
  USER_DASHBOARD = 'USER_DASHBOARD',
  PROFILE = 'PROFILE'
}

// --- Squadran Schema Types ---

export interface Institution {
  id: string;
  name: string;
  code: string; // e.g. NFSU, IITD
  logo: string;
  description: string;
  themeColor: string;
}

export interface OnboardingRequest {
  id: string;
  instituteName: string;
  email: string;
  contactName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface UserProfile {
  uid: string;
  institutionId: string; // Links user to specific school
  name: string;
  email?: string;
  rollNo?: string;
  role: UserRole;
  avatar?: string;
  batch?: string;
  bio?: string;
  blocked?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Post {
  id: string;
  institutionId: string; // Links post to specific school
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  title?: string;
  image?: string;
  likes: number;
  comments: Comment[];
  status: 'PENDING' | 'VERIFIED';
  type: 'NEWSLETTER' | 'JOB' | 'EVENTS';
  timestamp: number;
  company?: string;
  jobLink?: string;
}

export interface Feature {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}