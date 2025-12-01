import { Injectable, signal, computed } from '@angular/core';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  featuredImage: string;
  author: string;
  publishedDate: string; // YYYY-MM-DD format for easy sorting
  seoTitle: string;
  metaDescription: string;
  slug: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
}

export interface SiteSettings {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headerFont: string;
  bodyFont: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {

  // Signals for application content
  posts = signal<Post[]>([]);
  users = signal<User[]>([]);
  categories = signal<string[]>(['News', 'Events', 'Success Story', 'Programs']);
  siteSettings = signal<SiteSettings>({
    siteName: 'নাড়াজোল ছাত্রদল',
    primaryColor: '#1e40af', // Blue-700
    secondaryColor: '#10b981', // Green-500
    accentColor: '#f59e0b', // Amber-500
    headerFont: 'Noto Sans Bengali',
    bodyFont: 'Roboto'
  });

  // Computed signal for latest posts (e.g., for homepage)
  latestPosts = computed(() => {
    // Filter for 'News' or 'Events' categories, sort by date, take top 3
    return this.posts()
      .filter(post => post.category === 'News' || post.category === 'Events')
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
      .slice(0, 3);
  });

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    // Placeholder posts
    const initialPosts: Post[] = [
      {
        id: '1',
        title: 'বিনামূল্যে শিক্ষাদান কর্মসূচির উদ্বোধন',
        content: 'নাড়াজোল ছাত্রদল সম্প্রতি একটি নতুন বিনামূল্যে শিক্ষাদান কর্মসূচির উদ্বোধন করেছে, যা এলাকার দরিদ্র ও মেধাবী শিক্ষার্থীদের জন্য একটি বড় সুযোগ এনেছে।',
        category: 'News',
        tags: ['শিক্ষা', 'উদ্যোগ'],
        featuredImage: 'https://picsum.photos/800/600?random=1',
        author: 'Admin',
        publishedDate: '2024-07-20',
        seoTitle: 'বিনামূল্যে শিক্ষাদান কর্মসূচির উদ্বোধন - নাড়াজোল ছাত্রদল',
        metaDescription: 'নাড়াজোল ছাত্রদল কর্তৃক নতুন বিনামূল্যে শিক্ষাদান কর্মসূচির উদ্বোধন, দরিদ্র শিক্ষার্থীদের জন্য সুযোগ।',
        slug: 'free-tutoring-launch'
      },
      {
        id: '2',
        title: 'মাসিক স্বাস্থ্য সচেতনতা শিবির',
        content: 'আমাদের মাসিক স্বাস্থ্য সচেতনতা শিবির এই রবিবার সফলভাবে আয়োজিত হয়েছে। এলাকার বিপুল সংখ্যক মানুষ এতে অংশগ্রহণ করেছেন এবং বিনামূল্যে স্বাস্থ্য পরীক্ষা করিয়েছেন।',
        category: 'Events',
        tags: ['স্বাস্থ্য', 'শিবির'],
        featuredImage: 'https://picsum.photos/800/600?random=2',
        author: 'Admin',
        publishedDate: '2024-07-15',
        seoTitle: 'মাসিক স্বাস্থ্য সচেতনতা শিবির - নাড়াজোল ছাত্রদল',
        metaDescription: 'নাড়াজোল ছাত্রদল কর্তৃক আয়োজিত মাসিক স্বাস্থ্য সচেতনতা শিবির।',
        slug: 'monthly-health-camp'
      },
      {
        id: '3',
        title: 'বৃক্ষরোপণ অভিযান ২০২৩ এর সাফল্য',
        content: 'গত বছর অনুষ্ঠিত বৃক্ষরোপণ অভিযান ২০২৩ সফলভাবে সম্পন্ন হয়েছে। আমরা ১০০০ টিরও বেশি চারা রোপণ করেছি, যা পরিবেশ সংরক্ষণে একটি বড় পদক্ষেপ।',
        category: 'Success Story',
        tags: ['পরিবেশ', 'সাফল্য'],
        featuredImage: 'https://picsum.photos/800/600?random=3',
        author: 'Admin',
        publishedDate: '2023-11-05',
        seoTitle: 'বৃক্ষরোপণ অভিযান ২০২৩ এর সাফল্য - নাড়াজোল ছাত্রদল',
        metaDescription: 'নাড়াজোল ছাত্রদল কর্তৃক বৃক্ষরোপণ অভিযান ২০২৩ এর সাফল্য।',
        slug: 'tree-plantation-success'
      },
      {
        id: '4',
        title: 'আগামী মাসিকের বিশেষ কর্মসূচি',
        content: 'আসছে মাসে আমরা নারী ও শিশু উন্নয়নে একটি বিশেষ কর্মসূচি হাতে নিচ্ছি। এতে মা ও শিশুদের স্বাস্থ্য ও পুষ্টি নিয়ে বিস্তারিত আলোচনা করা হবে।',
        category: 'Events',
        tags: ['নারী', 'শিশু', 'উন্নয়ন'],
        featuredImage: 'https://picsum.photos/800/600?random=4',
        author: 'Admin',
        publishedDate: '2024-08-10',
        seoTitle: 'নারী ও শিশু উন্নয়ন কর্মসূচি - নাড়াজোল ছাত্রদল',
        metaDescription: 'নাড়াজোল ছাত্রদল কর্তৃক আগামী মাসে নারী ও শিশু উন্নয়নে বিশেষ কর্মসূচি।',
        slug: 'womens-child-program-aug'
      },
      {
        id: '5',
        title: 'কম্পিউটার প্রশিক্ষণ কর্মশালা',
        content: 'তরুণদের কর্মসংস্থানের সুযোগ বাড়াতে আমাদের নতুন কম্পিউটার প্রশিক্ষণ কর্মশালা শুরু হয়েছে। এতে মৌলিক কম্পিউটার জ্ঞান ও সফটওয়্যার ব্যবহার শেখানো হবে।',
        category: 'Programs',
        tags: ['প্রযুক্তি', 'প্রশিক্ষণ'],
        featuredImage: 'https://picsum.photos/800/600?random=5',
        author: 'Admin',
        publishedDate: '2024-06-01',
        seoTitle: 'কম্পিউটার প্রশিক্ষণ কর্মশালা - নাড়াজোল ছাত্রদল',
        metaDescription: 'নাড়াজোল ছাত্রদল কর্তৃক তরুণদের জন্য কম্পিউটার প্রশিক্ষণ কর্মশালা।',
        slug: 'computer-training-workshop'
      }
    ];
    this.posts.set(initialPosts);

    // Placeholder users
    const initialUsers: User[] = [
      { id: 'usr-1', name: 'Super Admin', email: 'admin@example.com', role: 'admin' },
      { id: 'usr-2', name: 'Editor One', email: 'editor@example.com', role: 'editor' },
    ];
    this.users.set(initialUsers);
  }

  // Post management
  getPosts(): Post[] {
    return this.posts();
  }

  getPostById(id: string): Post | undefined {
    return this.posts().find(post => post.id === id);
  }

  getPostsByCategory(category: string): Post[] {
    return this.posts().filter(post => post.category === category);
  }

  addPost(newPost: Omit<Post, 'id'>): void {
    const postWithId: Post = { ...newPost, id: `post-${Date.now()}` };
    this.posts.update(currentPosts => [...currentPosts, postWithId]);
  }

  updatePost(id: string, updatedPost: Partial<Post>): void {
    this.posts.update(currentPosts =>
      currentPosts.map(post => (post.id === id ? { ...post, ...updatedPost } : post))
    );
  }

  deletePost(id: string): void {
    this.posts.update(currentPosts => currentPosts.filter(post => post.id !== id));
  }

  // User management
  getUsers(): User[] {
    return this.users();
  }

  addUser(newUser: Omit<User, 'id'>): void {
    const userWithId: User = { ...newUser, id: `user-${Date.now()}` };
    this.users.update(currentUsers => [...currentUsers, userWithId]);
  }

  updateUserRole(id: string, newRole: 'admin' | 'editor'): void {
    this.users.update(currentUsers =>
      currentUsers.map(user => (user.id === id ? { ...user, role: newRole } : user))
    );
  }

  deleteUser(id: string): void {
    this.users.update(currentUsers => currentUsers.filter(user => user.id !== id));
  }

  // Site settings
  getSiteSettings(): SiteSettings {
    return this.siteSettings();
  }

  updateSiteSettings(newSettings: Partial<SiteSettings>): void {
    this.siteSettings.update(currentSettings => ({ ...currentSettings, ...newSettings }));
  }
}
