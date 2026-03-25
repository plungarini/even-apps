# Reddit Client App - Implementation Plan

> **App Name:** `reddit-client`  
> **Target Platform:** Even Realities G2 Smart Glasses  
> **Tech Stack:** TypeScript, Vite, Even Hub SDK

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REDDIT CLIENT APP                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PRESENTATION LAYER                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Feed View  │  │ Detail View │  │Comment View │  │  Menu View  │ │   │
│  │  │ (ListCont.) │  │(TextCont.)  │  │(TextCont.)  │  │ (ListCont.) │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│  ┌───────────────────────────┴─────────────────────────────────────────┐   │
│  │                         STATE MANAGER                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ PostStore   │  │  UserStore  │  │  UIManager  │  │EventHandler │ │   │
│  │  │ (reactive)  │  │ (auth/prefs)│  │ (navigation)│  │ (gestures)  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│  ┌───────────────────────────┴─────────────────────────────────────────┐   │
│  │                      REDDIT SERVICE LAYER                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │RedditClient │  │RateLimiter  │  │ AuthManager │  │ EndpointConf│ │   │
│  │  │ (http/fetch)│  │ (throttle)  │  │(cookies/oa) │  │ (feeds)     │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              ▲                                              │
│  ┌───────────────────────────┴─────────────────────────────────────────┐   │
│  │                       DATA LAYER                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ PostCache   │  │ SeenPosts   │  │ IndexedDB   │  │ LocalStorage│ │   │
│  │  │ (LRU cache) │  │(deduplicate)│  │ (persistent)│  │ (config)    │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BACKGROUND SYNC SERVICE                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ SyncEngine  │  │  Scheduler  │  │ Notifier    │                  │   │
│  │  │ (fetch)     │  │ (interval)  │  │ (events)    │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Foundation

### Task 1.1: Initialize App Structure
**Files to Create:**
```
apps/reddit-client/
├── index.html              # Entry HTML
├── app.json                # Even Hub manifest
├── package.json            # Dependencies
├── vite.config.ts          # Build config
├── tsconfig.json           # TypeScript config
├── .gitignore              # Git ignores
├── README.md               # Documentation
├── src/
│   ├── main.ts             # App bootstrap
│   ├── styles.css          # Minimal styles
│   ├── types/
│   │   └── index.ts        # Type definitions
│   ├── config/
│   │   └── app-config.ts   # Configuration schema
│   ├── services/
│   │   ├── reddit/
│   │   │   ├── client.ts   # HTTP client
│   │   │   ├── auth.ts     # Authentication
│   │   │   ├── rate-limiter.ts
│   │   │   ├── endpoints.ts
│   │   │   └── types.ts
│   │   ├── cache/
│   │   │   ├── post-cache.ts
│   │   │   ├── seen-posts.ts
│   │   │   └── storage.ts
│   │   └── sync/
│   │       ├── sync-engine.ts
│   │       └── scheduler.ts
│   ├── state/
│   │   ├── post-store.ts
│   │   ├── user-store.ts
│   │   └── ui-manager.ts
│   └── ui/
│       ├── components/
│       │   ├── feed-view.ts
│       │   ├── detail-view.ts
│       │   ├── comment-view.ts
│       │   └── menu-view.ts
│       ├── navigation.ts
│       └── renderer.ts
```

**Dependencies:**
```json
{
  "dependencies": {
    "@evenrealities/even_hub_sdk": "^0.0.9",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "@evenrealities/evenhub-cli": "^0.1.10",
    "@evenrealities/evenhub-simulator": "^0.6.2",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
```

### Task 1.2: Core Type Definitions

```typescript
// src/types/index.ts

// Reddit API Types
export interface RedditPost {
  id: string;
  fullname: string;           // t3_xxxxx
  subreddit: string;
  title: string;
  url: string;
  permalink: string;
  selftext?: string;
  author: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  createdUtc: number;
  contentType: 'link' | 'self' | 'image' | 'video' | 'gallery';
  thumbnail?: string;
  preview?: string;
  flair?: string;
  isNsfw: boolean;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  replies?: RedditComment[];
}

export interface RedditListing<T> {
  data: {
    children: Array<{ kind: string; data: T }>;
    after: string | null;
    before: string | null;
    modhash?: string;
  };
}

// App State Types
export interface CachedPost extends RedditPost {
  cachedAt: number;
  seen: boolean;
  interaction?: 'upvote' | 'downvote' | 'hide';
}

export interface FeedConfig {
  endpoint: FeedEndpoint;
  subreddit?: string;
  sort?: SortOption;
  time?: TimeFilter;
  limit: number;
}

export type FeedEndpoint = 
  | 'best' | 'hot' | 'new' | 'rising' | 'top' | 'controversial'
  | 'r/popular' | 'r/all';

export type SortOption = 'hot' | 'new' | 'top' | 'rising' | 'controversial';
export type TimeFilter = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

// Configuration Types
export interface AppConfig {
  version: string;
  auth: AuthConfig;
  feed: FeedConfig;
  sync: SyncConfig;
  cache: CacheConfig;
  ui: UIConfig;
}

export interface AuthConfig {
  type: 'cookie' | 'oauth';
  tokenV2?: string;
  session?: string;
  userAgent: string;
  modhash?: string;
}

export interface SyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  autoUpdate: boolean;
  notifyOnNewPosts: boolean;
}

export interface CacheConfig {
  maxPosts: number;
  expireAfterHours: number;
  cacheComments: boolean;
}

export interface UIConfig {
  showThumbnails: boolean;
  compactView: boolean;
  defaultSort: SortOption;
  gestures: GestureConfig;
}

export interface GestureConfig {
  swipeForward: Action;
  swipeBackward: Action;
  singleTap: Action;
  doubleTap: Action;
}

export type Action = 
  | 'next' | 'prev' | 'scrollUp' | 'scrollDown' 
  | 'open' | 'back' | 'upvote' | 'downvote' 
  | 'menu' | 'comments' | 'refresh';
```

---

## Phase 2: Reddit Service Layer

### Task 2.1: Rate Limiter Implementation

```typescript
// src/services/reddit/rate-limiter.ts

export interface RateLimitState {
  used: number;
  remaining: number;
  resetSeconds: number;
  lastUpdated: number;
}

export class RateLimiter {
  private state: RateLimitState = {
    used: 0,
    remaining: 60,
    resetSeconds: 60,
    lastUpdated: Date.now(),
  };

  private minRemaining = 5;
  private queue: Array<() => void> = [];
  private processing = false;

  updateFromHeaders(headers: Headers): void {
    const used = headers.get('x-ratelimit-used');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');

    if (used !== null) this.state.used = parseInt(used, 10);
    if (remaining !== null) this.state.remaining = parseInt(remaining, 10);
    if (reset !== null) this.state.resetSeconds = parseInt(reset, 10);
    
    this.state.lastUpdated = Date.now();
  }

  async throttle(): Promise<void> {
    if (this.state.remaining > this.minRemaining) {
      return;
    }

    // Wait for rate limit reset
    const waitMs = this.state.resetSeconds * 1000;
    console.log(`[RateLimiter] Throttling for ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
    
    // Reset state estimate
    this.state.remaining = 60;
  }

  getState(): RateLimitState {
    return { ...this.state };
  }
}
```

### Task 2.2: Authentication Manager

```typescript
// src/services/reddit/auth.ts

import { AuthConfig } from '../../types';

export class AuthManager {
  private config: AuthConfig;
  private modhash: string = '';

  constructor(config: AuthConfig) {
    this.config = config;
  }

  buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent,
      'Accept': 'application/json',
      ...extra,
    };

    if (this.config.type === 'cookie') {
      const cookies: string[] = [];
      if (this.config.tokenV2) {
        cookies.push(`token_v2=${this.config.tokenV2}`);
      }
      if (this.config.session) {
        cookies.push(`reddit_session=${this.config.session}`);
      }
      if (cookies.length > 0) {
        headers['Cookie'] = cookies.join('; ');
      }
    }

    if (this.modhash) {
      headers['x-modhash'] = this.modhash;
    }

    return headers;
  }

  async initialize(): Promise<void> {
    if (this.config.type === 'cookie') {
      await this.fetchModhash();
    }
  }

  private async fetchModhash(): Promise<void> {
    try {
      const response = await fetch('https://www.reddit.com/api/me.json', {
        headers: this.buildHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.modhash = data.data?.modhash || '';
      
      console.log('[AuthManager] Modhash acquired');
    } catch (error) {
      console.error('[AuthManager] Failed to initialize:', error);
      throw error;
    }
  }

  getModhash(): string {
    return this.modhash;
  }

  isAuthenticated(): boolean {
    if (this.config.type === 'cookie') {
      return !!this.config.tokenV2 && !!this.modhash;
    }
    return false;
  }
}
```

### Task 2.3: Reddit API Client

```typescript
// src/services/reddit/client.ts

import { AuthManager } from './auth';
import { RateLimiter } from './rate-limiter';
import { RedditPost, RedditComment, RedditListing, FeedConfig } from '../../types';

export class RedditClient {
  private auth: AuthManager;
  private rateLimiter: RateLimiter;
  private baseUrl = 'https://www.reddit.com';

  constructor(auth: AuthManager, rateLimiter: RateLimiter) {
    this.auth = auth;
    this.rateLimiter = rateLimiter;
  }

  async initialize(): Promise<void> {
    await this.auth.initialize();
  }

  // GET request with rate limiting
  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    await this.rateLimiter.throttle();

    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('raw_json', '1');
    
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString(), {
      headers: this.auth.buildHeaders(),
    });

    // Update rate limit tracking
    this.rateLimiter.updateFromHeaders(response.headers);

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as T;
  }

  // POST request (for votes, hide, etc.)
  private async post(path: string, body: Record<string, string>): Promise<unknown> {
    await this.rateLimiter.throttle();

    const url = `${this.baseUrl}${path}`;
    const formData = new URLSearchParams(body);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.auth.buildHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: formData.toString(),
    });

    this.rateLimiter.updateFromHeaders(response.headers);

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    return response.json();
  }

  // Feed endpoints
  async fetchFeed(config: FeedConfig): Promise<RedditPost[]> {
    let path: string;
    
    if (config.subreddit) {
      path = `/r/${config.subreddit}/${config.sort || 'hot'}.json`;
    } else if (config.endpoint === 'best') {
      path = '/best.json';
    } else if (config.endpoint.startsWith('r/')) {
      path = `/${config.endpoint}.json`;
    } else {
      path = `/${config.endpoint}.json`;
    }

    const params: Record<string, string> = {
      limit: String(config.limit),
    };

    if (config.time && (config.sort === 'top' || config.sort === 'controversial')) {
      params.t = config.time;
    }

    const listing = await this.get<RedditListing<any>>(path, params);
    
    return listing.data.children
      .filter(child => child.kind === 't3')
      .map(child => this.normalizePost(child.data));
  }

  // Fetch comments for a post
  async fetchComments(postId: string, limit: number = 10): Promise<RedditComment[]> {
    const response = await this.get<[unknown, RedditListing<any>]>(
      `/comments/${postId}.json`,
      { limit: String(limit), depth: '2', sort: 'top' }
    );

    const commentListing = response[1];
    return this.flattenComments(commentListing.data.children);
  }

  // Post interactions
  async upvote(fullname: string): Promise<void> {
    await this.post('/api/vote', { id: fullname, dir: '1' });
  }

  async downvote(fullname: string): Promise<void> {
    await this.post('/api/vote', { id: fullname, dir: '-1' });
  }

  async unvote(fullname: string): Promise<void> {
    await this.post('/api/vote', { id: fullname, dir: '0' });
  }

  async hide(fullname: string): Promise<void> {
    await this.post('/api/hide', { id: fullname });
  }

  async unhide(fullname: string): Promise<void> {
    await this.post('/api/unhide', { id: fullname });
  }

  async save(fullname: string): Promise<void> {
    await this.post('/api/save', { id: fullname });
  }

  async unsave(fullname: string): Promise<void> {
    await this.post('/api/unsave', { id: fullname });
  }

  // Normalize raw Reddit post data
  private normalizePost(raw: any): RedditPost {
    let contentType: RedditPost['contentType'] = 'link';
    if (raw.is_self) contentType = 'self';
    else if (raw.url?.match(/\.(jpg|png|gif|webp)$/i)) contentType = 'image';
    else if (raw.url?.includes('v.redd.it')) contentType = 'video';
    else if (raw.url?.includes('reddit.com/gallery')) contentType = 'gallery';

    return {
      id: raw.id,
      fullname: raw.name,
      subreddit: raw.subreddit,
      title: raw.title,
      url: raw.url,
      permalink: raw.permalink,
      selftext: raw.selftext,
      author: raw.author,
      score: raw.score,
      upvoteRatio: raw.upvote_ratio,
      numComments: raw.num_comments,
      createdUtc: raw.created_utc,
      contentType,
      thumbnail: raw.thumbnail,
      preview: raw.preview?.images?.[0]?.source?.url,
      flair: raw.link_flair_text,
      isNsfw: raw.over_18,
    };
  }

  private flattenComments(children: any[], maxDepth: number = 2, depth: number = 0): RedditComment[] {
    const result: RedditComment[] = [];

    for (const child of children) {
      if (child.kind !== 't1') continue;
      if (child.data.author === '[deleted]' || child.data.body === '[deleted]') continue;

      result.push({
        id: child.data.id,
        author: child.data.author,
        body: child.data.body,
        score: child.data.score,
        createdUtc: child.data.created_utc,
      });

      if (depth < maxDepth && typeof child.data.replies === 'object') {
        const replies = child.data.replies?.data?.children || [];
        result.push(...this.flattenComments(replies, maxDepth, depth + 1));
      }
    }

    return result.sort((a, b) => b.score - a.score);
  }
}
```

### Task 2.4: Endpoint Configuration

```typescript
// src/services/reddit/endpoints.ts

import { FeedEndpoint, SortOption, TimeFilter } from '../../types';

export interface EndpointDefinition {
  name: string;
  path: string;
  requiresAuth: boolean;
  supportsSort: boolean;
  supportsTime: boolean;
  description: string;
}

export const ENDPOINTS: Record<FeedEndpoint, EndpointDefinition> = {
  best: {
    name: 'Best',
    path: '/best.json',
    requiresAuth: true,
    supportsSort: false,
    supportsTime: false,
    description: 'Personalized best feed (requires login)',
  },
  hot: {
    name: 'Hot',
    path: '/hot.json',
    requiresAuth: false,
    supportsSort: false,
    supportsTime: false,
    description: 'Currently trending posts',
  },
  new: {
    name: 'New',
    path: '/new.json',
    requiresAuth: false,
    supportsSort: false,
    supportsTime: false,
    description: 'Newest posts first',
  },
  rising: {
    name: 'Rising',
    path: '/rising.json',
    requiresAuth: false,
    supportsSort: false,
    supportsTime: false,
    description: 'Posts gaining popularity',
  },
  top: {
    name: 'Top',
    path: '/top.json',
    requiresAuth: false,
    supportsSort: false,
    supportsTime: true,
    description: 'Top posts by time period',
  },
  controversial: {
    name: 'Controversial',
    path: '/controversial.json',
    requiresAuth: false,
    supportsSort: false,
    supportsTime: true,
    description: 'Most controversial posts',
  },
  'r/popular': {
    name: 'Popular',
    path: '/r/popular.json',
    requiresAuth: false,
    supportsSort: true,
    supportsTime: true,
    description: 'Popular across Reddit',
  },
  'r/all': {
    name: 'All',
    path: '/r/all.json',
    requiresAuth: false,
    supportsSort: true,
    supportsTime: true,
    description: 'Posts from all of Reddit',
  },
};

export const SORT_OPTIONS: SortOption[] = ['hot', 'new', 'top', 'rising', 'controversial'];

export const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'hour', label: 'Past Hour' },
  { value: 'day', label: 'Past Day' },
  { value: 'week', label: 'Past Week' },
  { value: 'month', label: 'Past Month' },
  { value: 'year', label: 'Past Year' },
  { value: 'all', label: 'All Time' },
];

export function getEndpointUrl(endpoint: FeedEndpoint, subreddit?: string): string {
  if (subreddit) {
    return `/r/${subreddit}`;
  }
  return ENDPOINTS[endpoint].path.replace('.json', '');
}
```

---

## Phase 3: Caching Layer

### Task 3.1: IndexedDB Storage

```typescript
// src/services/cache/storage.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CachedPost } from '../../types';

interface RedditClientDB extends DBSchema {
  posts: {
    key: string;
    value: CachedPost;
    indexes: { 'by-cached-at': number; 'by-subreddit': string };
  };
  config: {
    key: string;
    value: any;
  };
  seen: {
    key: string;
    value: { id: string; seenAt: number };
  };
}

export class StorageService {
  private db: IDBPDatabase<RedditClientDB> | null = null;
  private readonly DB_NAME = 'reddit-client-db';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    this.db = await openDB<RedditClientDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Posts store
        const postStore = db.createObjectStore('posts', { keyPath: 'id' });
        postStore.createIndex('by-cached-at', 'cachedAt');
        postStore.createIndex('by-subreddit', 'subreddit');

        // Config store
        db.createObjectStore('config');

        // Seen posts store
        db.createObjectStore('seen', { keyPath: 'id' });
      },
    });
  }

  // Posts
  async savePost(post: CachedPost): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.put('posts', post);
  }

  async savePosts(posts: CachedPost[]): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    const tx = this.db.transaction('posts', 'readwrite');
    await Promise.all(posts.map(post => tx.store.put(post)));
    await tx.done;
  }

  async getPost(id: string): Promise<CachedPost | undefined> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.get('posts', id);
  }

  async getAllPosts(): Promise<CachedPost[]> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAll('posts');
  }

  async getPostsBySubreddit(subreddit: string): Promise<CachedPost[]> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.getAllFromIndex('posts', 'by-subreddit', subreddit);
  }

  async deleteOldPosts(maxAgeHours: number): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    
    const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);
    const tx = this.db.transaction('posts', 'readwrite');
    const index = tx.store.index('by-cached-at');
    
    const oldPosts = await index.getAll(IDBKeyRange.upperBound(cutoff));
    await Promise.all(oldPosts.map(post => tx.store.delete(post.id)));
    await tx.done;
  }

  async clearPosts(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.clear('posts');
  }

  // Config
  async getConfig<T>(key: string): Promise<T | undefined> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.get('config', key);
  }

  async setConfig<T>(key: string, value: T): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.put('config', value, key);
  }

  // Seen posts
  async markSeen(postId: string): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.put('seen', { id: postId, seenAt: Date.now() });
  }

  async isSeen(postId: string): Promise<boolean> {
    if (!this.db) throw new Error('DB not initialized');
    const record = await this.db.get('seen', postId);
    return !!record;
  }

  async getSeenCount(): Promise<number> {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.count('seen');
  }

  async clearSeen(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    await this.db.clear('seen');
  }
}
```

### Task 3.2: Post Cache with LRU

```typescript
// src/services/cache/post-cache.ts

import { CachedPost, FeedConfig } from '../../types';
import { StorageService } from './storage';

interface CacheEntry {
  posts: CachedPost[];
  fetchedAt: number;
  config: FeedConfig;
}

export class PostCache {
  private memoryCache = new Map<string, CacheEntry>();
  private storage: StorageService;
  private maxMemoryEntries = 10;
  private maxStoragePosts: number;
  private expireAfterMs: number;

  constructor(storage: StorageService, config: { maxPosts: number; expireAfterHours: number }) {
    this.storage = storage;
    this.maxStoragePosts = config.maxPosts;
    this.expireAfterMs = config.expireAfterHours * 60 * 60 * 1000;
  }

  generateKey(config: FeedConfig): string {
    const parts = [config.endpoint];
    if (config.subreddit) parts.push(`r:${config.subreddit}`);
    if (config.sort) parts.push(`sort:${config.sort}`);
    if (config.time) parts.push(`time:${config.time}`);
    return parts.join(':');
  }

  get(config: FeedConfig): CachedPost[] | null {
    const key = this.generateKey(config);
    const entry = this.memoryCache.get(key);

    if (!entry) return null;

    // Check expiration
    if (Date.now() - entry.fetchedAt > this.expireAfterMs) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.posts;
  }

  set(config: FeedConfig, posts: CachedPost[]): void {
    const key = this.generateKey(config);

    // Evict oldest if needed
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      posts,
      fetchedAt: Date.now(),
      config,
    });

    // Persist to storage
    this.persistPosts(posts);
  }

  private async persistPosts(posts: CachedPost[]): Promise<void> {
    const toSave = posts.map(p => ({
      ...p,
      cachedAt: Date.now(),
    }));
    await this.storage.savePosts(toSave);
  }

  async getFromStorage(subreddit?: string): Promise<CachedPost[]> {
    if (subreddit) {
      return this.storage.getPostsBySubreddit(subreddit);
    }
    return this.storage.getAllPosts();
  }

  async markSeen(postId: string): Promise<void> {
    await this.storage.markSeen(postId);

    // Update in memory
    for (const entry of this.memoryCache.values()) {
      const post = entry.posts.find(p => p.id === postId);
      if (post) {
        post.seen = true;
        break;
      }
    }
  }

  async isSeen(postId: string): Promise<boolean> {
    return this.storage.isSeen(postId);
  }

  async cleanup(): Promise<void> {
    // Clean old posts from storage
    await this.storage.deleteOldPosts(this.expireAfterMs / (60 * 60 * 1000));
  }
}
```

---

## Phase 4: State Management

### Task 4.1: Post Store (Reactive)

```typescript
// src/state/post-store.ts

import { CachedPost, FeedConfig, RedditPost } from '../types';
import { PostCache } from '../services/cache/post-cache';
import { RedditClient } from '../services/reddit/client';

type PostStoreListener = () => void;

export class PostStore {
  private posts: CachedPost[] = [];
  private currentIndex = 0;
  private currentFeed: FeedConfig | null = null;
  private loading = false;
  private error: string | null = null;
  
  private listeners: PostStoreListener[] = [];
  private cache: PostCache;
  private client: RedditClient;

  constructor(cache: PostCache, client: RedditClient) {
    this.cache = cache;
    this.client = client;
  }

  subscribe(listener: PostStoreListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  // Getters
  getPosts(): CachedPost[] {
    return this.posts;
  }

  getCurrentPost(): CachedPost | null {
    return this.posts[this.currentIndex] || null;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): string | null {
    return this.error;
  }

  // Actions
  async loadFeed(config: FeedConfig): Promise<void> {
    this.loading = true;
    this.error = null;
    this.notify();

    try {
      // Try cache first
      const cached = this.cache.get(config);
      if (cached && cached.length > 0) {
        this.posts = cached;
        this.currentIndex = 0;
        this.currentFeed = config;
      }

      // Fetch fresh
      const fresh = await this.client.fetchFeed(config);
      
      // Merge with seen status
      const cachedPosts = await Promise.all(
        fresh.map(async p => ({
          ...p,
          cachedAt: Date.now(),
          seen: await this.cache.isSeen(p.id),
        }))
      );

      this.posts = cachedPosts;
      this.currentIndex = 0;
      this.currentFeed = config;

      // Update cache
      this.cache.set(config, cachedPosts);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load feed';
      console.error('[PostStore] Load error:', err);
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  nextPost(): void {
    if (this.currentIndex < this.posts.length - 1) {
      this.currentIndex++;
      this.markCurrentSeen();
      this.notify();
    }
  }

  prevPost(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.markCurrentSeen();
      this.notify();
    }
  }

  private async markCurrentSeen(): Promise<void> {
    const post = this.getCurrentPost();
    if (post && !post.seen) {
      post.seen = true;
      await this.cache.markSeen(post.id);
    }
  }

  async refresh(): Promise<void> {
    if (this.currentFeed) {
      await this.loadFeed(this.currentFeed);
    }
  }

  // Interactions
  async upvoteCurrent(): Promise<void> {
    const post = this.getCurrentPost();
    if (!post) return;

    try {
      await this.client.upvote(post.fullname);
      post.interaction = 'upvote';
      this.notify();
    } catch (err) {
      console.error('[PostStore] Upvote failed:', err);
    }
  }

  async downvoteCurrent(): Promise<void> {
    const post = this.getCurrentPost();
    if (!post) return;

    try {
      await this.client.downvote(post.fullname);
      post.interaction = 'downvote';
      this.notify();
    } catch (err) {
      console.error('[PostStore] Downvote failed:', err);
    }
  }

  async hideCurrent(): Promise<void> {
    const post = this.getCurrentPost();
    if (!post) return;

    try {
      await this.client.hide(post.fullname);
      post.interaction = 'hide';
      this.notify();
    } catch (err) {
      console.error('[PostStore] Hide failed:', err);
    }
  }
}
```

### Task 4.2: UI Manager

```typescript
// src/state/ui-manager.ts

export type ViewMode = 'feed' | 'detail' | 'comments' | 'menu';

export class UIManager {
  private currentView: ViewMode = 'feed';
  private listeners: Array<(view: ViewMode) => void> = [];

  subscribe(listener: (view: ViewMode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notify(): void {
    this.listeners.forEach(l => l(this.currentView));
  }

  getCurrentView(): ViewMode {
    return this.currentView;
  }

  setView(view: ViewMode): void {
    this.currentView = view;
    this.notify();
  }

  goBack(): void {
    switch (this.currentView) {
      case 'comments':
      case 'detail':
        this.currentView = 'feed';
        break;
      case 'menu':
        this.currentView = 'feed';
        break;
    }
    this.notify();
  }
}
```

---

## Phase 5: UI Components (Even Hub SDK)

### Task 5.1: Feed View (List Container)

```typescript
// src/ui/components/feed-view.ts

import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  EvenAppBridge,
} from '@evenrealities/even_hub_sdk';
import { CachedPost } from '../../types';

export class FeedView {
  private bridge: EvenAppBridge;
  private onSelect: (index: number) => void;

  constructor(bridge: EvenAppBridge, onSelect: (index: number) => void) {
    this.bridge = bridge;
    this.onSelect = onSelect;
  }

  async render(posts: CachedPost[], selectedIndex: number = 0): Promise<void> {
    const items = posts.slice(0, 20).map((post, index) => {
      const prefix = index === selectedIndex ? '▶ ' : '  ';
      const score = this.formatScore(post.score);
      const title = this.truncate(post.title, 50);
      return `${prefix}${score} ${title}`;
    });

    const container = new CreateStartUpPageContainer({
      containerTotalNum: 1,
      listObject: [
        new ListContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 1,
          borderColor: 13,
          borderRdaius: 6,
          paddingLength: 5,
          containerID: 1,
          containerName: 'feed',
          isEventCapture: 1,
          itemContainer: new ListItemContainerProperty({
            itemCount: items.length,
            itemWidth: 560,
            isItemSelectBorderEn: 1,
            itemName: items,
          }),
        }),
      ],
    });

    await this.bridge.createStartUpPageContainer(container);
  }

  private formatScore(score: number): string {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return String(score);
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
```

### Task 5.2: Detail View (Text Container)

```typescript
// src/ui/components/detail-view.ts

import {
  CreateStartUpPageContainer,
  TextContainerProperty,
  EvenAppBridge,
} from '@evenrealities/even_hub_sdk';
import { CachedPost } from '../../types';

export class DetailView {
  private bridge: EvenAppBridge;

  constructor(bridge: EvenAppBridge) {
    this.bridge = bridge;
  }

  async render(post: CachedPost): Promise<void> {
    const content = this.buildContent(post);

    const container = new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 1,
          borderColor: 5,
          borderRdaius: 4,
          paddingLength: 8,
          containerID: 1,
          containerName: 'detail',
          isEventCapture: 1,
          content,
        }),
      ],
    });

    await this.bridge.createStartUpPageContainer(container);
  }

  private buildContent(post: CachedPost): string {
    const lines: string[] = [];

    // Header with subreddit and score
    lines.push(`r/${post.subreddit}  |  ▲ ${post.score}  |  💬 ${post.numComments}`);
    lines.push('');

    // Title
    lines.push(this.wrapText(post.title, 70));
    lines.push('');

    // Selftext (if available)
    if (post.selftext) {
      lines.push(this.wrapText(post.selftext, 70).substring(0, 800));
      lines.push('');
    }

    // URL for link posts
    if (post.contentType === 'link' && !post.selftext) {
      lines.push(`🔗 ${this.truncate(post.url, 60)}`);
      lines.push('');
    }

    // Footer
    lines.push('─'.repeat(50));
    lines.push('Swipe: Navigate  |  Tap: Comments  |  Double: Back');

    return lines.join('\n');
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > width) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
```

### Task 5.3: Comment View

```typescript
// src/ui/components/comment-view.ts

import {
  CreateStartUpPageContainer,
  TextContainerProperty,
  EvenAppBridge,
} from '@evenrealities/even_hub_sdk';
import { RedditComment } from '../../types';

export class CommentView {
  private bridge: EvenAppBridge;

  constructor(bridge: EvenAppBridge) {
    this.bridge = bridge;
  }

  async render(comments: RedditComment[]): Promise<void> {
    const content = this.buildContent(comments);

    const container = new CreateStartUpPageContainer({
      containerTotalNum: 1,
      textObject: [
        new TextContainerProperty({
          xPosition: 0,
          yPosition: 0,
          width: 576,
          height: 288,
          borderWidth: 1,
          borderColor: 5,
          borderRdaius: 4,
          paddingLength: 8,
          containerID: 1,
          containerName: 'comments',
          isEventCapture: 1,
          content,
        }),
      ],
    });

    await this.bridge.createStartUpPageContainer(container);
  }

  private buildContent(comments: RedditComment[]): string {
    if (comments.length === 0) {
      return 'No comments yet.\n\nDouble-tap to go back.';
    }

    const lines: string[] = [];
    lines.push(`💬 Comments (${comments.length})`);
    lines.push('');

    for (const comment of comments.slice(0, 5)) {
      lines.push(`u/${comment.author}  ·  ▲ ${comment.score}`);
      lines.push(this.wrapText(comment.body, 65));
      lines.push('');
    }

    lines.push('─'.repeat(40));
    lines.push('Double-tap to go back');

    return lines.join('\n').substring(0, 1950);
  }

  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > width) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  }
}
```

---

## Phase 6: Background Sync

### Task 6.1: Sync Engine

```typescript
// src/services/sync/sync-engine.ts

import { FeedConfig, CachedPost } from '../../types';
import { RedditClient } from '../reddit/client';
import { PostCache } from '../cache/post-cache';

export interface SyncResult {
  success: boolean;
  postsAdded: number;
  error?: string;
}

export class SyncEngine {
  private client: RedditClient;
  private cache: PostCache;
  private isRunning = false;

  constructor(client: RedditClient, cache: PostCache) {
    this.client = client;
    this.cache = cache;
  }

  async sync(feedConfig: FeedConfig): Promise<SyncResult> {
    if (this.isRunning) {
      return { success: false, postsAdded: 0, error: 'Sync already in progress' };
    }

    this.isRunning = true;

    try {
      console.log('[SyncEngine] Starting sync...');

      // Fetch fresh posts
      const freshPosts = await this.client.fetchFeed(feedConfig);

      // Get existing cached posts
      const cached = this.cache.get(feedConfig) || [];
      const existingIds = new Set(cached.map(p => p.id));

      // Find new posts
      const newPosts: CachedPost[] = [];
      for (const post of freshPosts) {
        if (!existingIds.has(post.id)) {
          newPosts.push({
            ...post,
            cachedAt: Date.now(),
            seen: false,
          });
        }
      }

      // Merge and cache
      const merged = [...newPosts, ...cached].slice(0, feedConfig.limit);
      this.cache.set(feedConfig, merged);

      console.log(`[SyncEngine] Sync complete: ${newPosts.length} new posts`);

      return {
        success: true,
        postsAdded: newPosts.length,
      };
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      return {
        success: false,
        postsAdded: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isRunning = false;
    }
  }

  isSyncing(): boolean {
    return this.isRunning;
  }
}
```

### Task 6.2: Scheduler

```typescript
// src/services/sync/scheduler.ts

import { SyncEngine } from './sync-engine';
import { FeedConfig } from '../../types';

export class SyncScheduler {
  private engine: SyncEngine;
  private intervalMinutes: number;
  private timerId: number | null = null;
  private feedConfig: FeedConfig | null = null;

  constructor(engine: SyncEngine, intervalMinutes: number = 30) {
    this.engine = engine;
    this.intervalMinutes = intervalMinutes;
  }

  start(feedConfig: FeedConfig): void {
    if (this.timerId !== null) {
      this.stop();
    }

    this.feedConfig = feedConfig;

    // Initial sync
    this.engine.sync(feedConfig);

    // Schedule recurring sync
    this.timerId = window.setInterval(() => {
      if (this.feedConfig) {
        this.engine.sync(this.feedConfig);
      }
    }, this.intervalMinutes * 60 * 1000);

    console.log(`[SyncScheduler] Started: ${this.intervalMinutes}min interval`);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('[SyncScheduler] Stopped');
    }
  }

  setInterval(minutes: number): void {
    this.intervalMinutes = minutes;
    if (this.timerId !== null && this.feedConfig) {
      this.start(this.feedConfig);
    }
  }

  isRunning(): boolean {
    return this.timerId !== null;
  }

  triggerImmediate(): Promise<import('./sync-engine').SyncResult> | null {
    if (this.feedConfig) {
      return this.engine.sync(this.feedConfig);
    }
    return null;
  }
}
```

---

## Phase 7: Main Application

### Task 7.1: Main Entry Point

```typescript
// src/main.ts

import { waitForEvenAppBridge, OsEventTypeList } from '@evenrealities/even_hub_sdk';
import { StorageService } from './services/cache/storage';
import { PostCache } from './services/cache/post-cache';
import { AuthManager } from './services/reddit/auth';
import { RateLimiter } from './services/reddit/rate-limiter';
import { RedditClient } from './services/reddit/client';
import { SyncEngine } from './services/sync/sync-engine';
import { SyncScheduler } from './services/sync/scheduler';
import { PostStore } from './state/post-store';
import { UIManager } from './state/ui-manager';
import { FeedView } from './ui/components/feed-view';
import { DetailView } from './ui/components/detail-view';
import { CommentView } from './ui/components/comment-view';
import { AppConfig, DEFAULT_CONFIG } from './config/app-config';

async function main() {
  console.log('[RedditClient] Starting...');

  // Initialize storage
  const storage = new StorageService();
  await storage.initialize();

  // Load or create config
  let config: AppConfig = await storage.getConfig('app') || DEFAULT_CONFIG;
  
  // Initialize Reddit client
  const authManager = new AuthManager(config.auth);
  const rateLimiter = new RateLimiter();
  const redditClient = new RedditClient(authManager, rateLimiter);

  try {
    await redditClient.initialize();
    console.log('[RedditClient] Reddit client initialized');
  } catch (err) {
    console.error('[RedditClient] Auth failed:', err);
  }

  // Initialize cache
  const postCache = new PostCache(storage, config.cache);

  // Initialize sync
  const syncEngine = new SyncEngine(redditClient, postCache);
  const syncScheduler = new SyncScheduler(syncEngine, config.sync.intervalMinutes);

  if (config.sync.enabled) {
    syncScheduler.start(config.feed);
  }

  // Initialize state
  const postStore = new PostStore(postCache, redditClient);
  const uiManager = new UIManager();

  // Wait for Even Hub bridge
  const bridge = await waitForEvenAppBridge();
  console.log('[RedditClient] Even Hub bridge ready');

  // Initialize UI components
  const feedView = new FeedView(bridge, (index) => {
    // Handle post selection
    postStore.currentIndex = index;
    uiManager.setView('detail');
  });
  const detailView = new DetailView(bridge);
  const commentView = new CommentView(bridge);

  // Render based on current state
  const render = async () => {
    const view = uiManager.getCurrentView();

    switch (view) {
      case 'feed':
        await feedView.render(postStore.getPosts(), postStore.getCurrentIndex());
        break;
      case 'detail': {
        const post = postStore.getCurrentPost();
        if (post) await detailView.render(post);
        break;
      }
      case 'comments': {
        const post = postStore.getCurrentPost();
        if (post) {
          const comments = await redditClient.fetchComments(post.id);
          await commentView.render(comments);
        }
        break;
      }
    }
  };

  // Subscribe to state changes
  postStore.subscribe(render);
  uiManager.subscribe(render);

  // Handle input events
  bridge.onEvenHubEvent((event) => {
    const type = event.textEvent?.eventType ?? event.sysEvent?.eventType;
    const view = uiManager.getCurrentView();

    // CLICK_EVENT (0) sometimes comes as undefined
    const isClick = type === OsEventTypeList.CLICK_EVENT || type === undefined;
    const isDoubleClick = type === OsEventTypeList.DOUBLE_CLICK_EVENT;
    const isScrollBottom = type === OsEventTypeList.SCROLL_BOTTOM_EVENT;
    const isScrollTop = type === OsEventTypeList.SCROLL_TOP_EVENT;

    if (view === 'feed') {
      if (isScrollBottom) {
        postStore.nextPost();
      } else if (isScrollTop) {
        postStore.prevPost();
      } else if (isClick) {
        uiManager.setView('detail');
      }
    } else if (view === 'detail') {
      if (isDoubleClick) {
        uiManager.goBack();
      } else if (isClick) {
        uiManager.setView('comments');
      } else if (isScrollBottom) {
        postStore.nextPost();
        uiManager.setView('detail');
      } else if (isScrollTop) {
        postStore.prevPost();
        uiManager.setView('detail');
      }
    } else if (view === 'comments') {
      if (isDoubleClick) {
        uiManager.goBack();
      }
    }
  });

  // Load initial feed
  await postStore.loadFeed(config.feed);

  console.log('[RedditClient] Ready');
}

main().catch(console.error);
```

### Task 7.2: Configuration

```typescript
// src/config/app-config.ts

import { AppConfig } from '../types';

export const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',
  auth: {
    type: 'cookie',
    tokenV2: '',
    session: '',
    userAgent: 'reddit-client-even/1.0 (Even G2 smart glasses)',
  },
  feed: {
    endpoint: 'hot',
    limit: 25,
  },
  sync: {
    enabled: true,
    intervalMinutes: 30,
    autoUpdate: true,
    notifyOnNewPosts: false,
  },
  cache: {
    maxPosts: 100,
    expireAfterHours: 24,
    cacheComments: true,
  },
  ui: {
    showThumbnails: false, // Not supported well on G2
    compactView: true,
    defaultSort: 'hot',
    gestures: {
      swipeForward: 'next',
      swipeBackward: 'prev',
      singleTap: 'open',
      doubleTap: 'back',
    },
  },
};
```

---

## Phase 8: Build & Development

### Task 8.1: Package Scripts

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "qr": "evenhub qr --http --port 5173",
    "pack": "npm run build && evenhub pack app.json dist -o reddit-client.ehpk",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

### Task 8.2: Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'even-hub': ['@evenrealities/even_hub_sdk'],
        },
      },
    },
  },
});
```

### Task 8.3: Manifest (app.json)

```json
{
  "package_id": "com.plungarini.redditclient",
  "edition": "202601",
  "name": "Reddit Client",
  "version": "1.0.0",
  "min_app_version": "0.1.0",
  "tagline": "Browse Reddit on your G2 glasses",
  "description": "A full-featured Reddit client for Even Realities G2 smart glasses. Browse feeds, read comments, upvote/downvote posts.",
  "author": "Pietro Lungarini",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["reddit.com", "www.reddit.com"]
  }
}
```

---

## Summary

### Implemented Features

1. **Authentication**: Cookie-based auth with modhash support
2. **Rate Limiting**: Automatic throttling with header tracking
3. **Caching**: Multi-level cache (memory + IndexedDB) with TTL
4. **Feeds**: All major endpoints (best, hot, new, rising, top, controversial)
5. **Interactions**: Upvote, downvote, hide posts
6. **Comments**: View top comments for any post
7. **Background Sync**: Auto-refresh with configurable intervals
8. **Seen Tracking**: Deduplication of viewed posts
9. **UI**: Optimized for G2 display constraints

### File Structure

```
apps/reddit-client/
├── src/
│   ├── config/
│   │   └── app-config.ts
│   ├── services/
│   │   ├── reddit/
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── rate-limiter.ts
│   │   │   ├── endpoints.ts
│   │   │   └── types.ts
│   │   ├── cache/
│   │   │   ├── post-cache.ts
│   │   │   └── storage.ts
│   │   └── sync/
│   │       ├── sync-engine.ts
│   │       └── scheduler.ts
│   ├── state/
│   │   ├── post-store.ts
│   │   └── ui-manager.ts
│   ├── ui/
│   │   └── components/
│   │       ├── feed-view.ts
│   │       ├── detail-view.ts
│   │       └── comment-view.ts
│   ├── types/
│   │   └── index.ts
│   ├── main.ts
│   └── styles.css
├── index.html
├── app.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Next Steps

1. Implement the files as outlined above
2. Add onboarding flow for auth setup
3. Add configuration UI (browser-based)
4. Add tests
5. Package and test on real G2 hardware
