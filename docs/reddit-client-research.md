# Reddit Client App - Research Document

> **Research Date:** March 2026  
> **Based on:** reddit-pi service (C:\DEV\pi\services\reddit-pi) and Reddit API documentation

---

## Table of Contents

1. [Reddit-Pi Service Analysis](#1-reddit-pi-service-analysis)
2. [Reddit API Endpoints Research](#2-reddit-api-endpoints-research)
3. [Authentication Mechanisms](#3-authentication-mechanisms)
4. [Rate Limiting](#4-rate-limiting)
5. [Even Hub Platform Constraints](#5-even-hub-platform-constraints)
6. [Architecture Recommendations](#6-architecture-recommendations)

---

## 1. Reddit-Pi Service Analysis

### 1.1 Overview
The reddit-pi service is a comprehensive Reddit client implementation with:
- Cookie-based authentication (no OAuth required)
- Automated feed fetching with intelligent scoring
- Background pipeline processing
- SQLite database for caching
- REST API for UI interactions
- WhatsApp notifications integration

### 1.2 Core Components

#### Authentication (`src/reddit/auth.ts`)
```typescript
interface RedditClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post(path: string, body: Record<string, string>): Promise<unknown>;
  modhash: string;
}
```

**Key Implementation Details:**
- Uses `token_v2` cookie from browser dev tools
- Optional `reddit_session` as fallback
- Custom User-Agent header required
- Modhash fetched from `/api/me.json` for POST requests
- Automatic rate limit tracking via response headers

#### Feed Fetching (`src/reddit/feed.ts`)
- Primary endpoint: `/best.json` (personalized feed)
- Pagination via `after` parameter
- Max 100 posts per request
- Polite 1-second delay between paginated requests
- Content type detection: link, self, image, video, gallery

#### Actions (`src/reddit/actions.ts`)
- `upvotePost(fullname, direction)` - direction: 1=upvote, 0=remove, -1=downvote
- `hidePost(fullname)` - Hide from feed
- `unhidePost(fullname)` - Unhide post

#### Comments (`src/reddit/comments.ts`)
- Endpoint: `/comments/{postId}.json`
- Returns 2-element array: [post_listing, comments_listing]
- Supports `limit`, `depth`, `sort` parameters
- Flattened comment structure with depth limiting

#### Database Schema (`src/db/schema.ts`)
```sql
-- Core tables
posts (id, fullname, subreddit, title, url, permalink, selftext, 
       author, score, upvote_ratio, num_comments, created_utc, 
       content_type, thumbnail, preview, flair, is_nsfw, 
       our_score, score_breakdown, llm_summary, fetched_at)

batches (id, post_ids, total_candidates, created_at, notified)

interactions (id, post_id, batch_id, action, dislike_reason, dislike_tags, created_at)

subreddit_scores (subreddit, likes, dislikes, score, last_updated)

content_fingerprints (post_id, keywords, created_at)
```

#### Configuration (`src/config.ts`)
Environment variables:
- `REDDIT_TOKEN_V2` - Primary auth cookie
- `REDDIT_SESSION` - Fallback session cookie
- `REDDIT_USER_AGENT` - Custom user agent
- `CRON_SCHEDULE` - Background fetch schedule
- `POSTS_PER_BATCH` - Number of posts per fetch
- `CANDIDATE_POOL_SIZE` - Pool size for scoring

### 1.3 Onboarding Script (`scripts/onboard.js`)
- Automated cookie extraction using Puppeteer
- Browser automation for Reddit login
- Interactive environment variable configuration
- Integration test validation

---

## 2. Reddit API Endpoints Research

### 2.1 Feed Endpoints (GET)

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `/best.json` | Personalized best feed | Yes (recommended) |
| `/hot.json` | Hot posts globally or by subreddit | No |
| `/new.json` | Newest posts | No |
| `/rising.json` | Rising posts | No |
| `/top.json` | Top posts (requires `t` param) | No |
| `/controversial.json` | Controversial posts | No |
| `/r/{subreddit}/{sort}.json` | Subreddit-specific feed | No |
| `/r/all/{sort}.json` | All of Reddit aggregated | No |
| `/r/popular/{sort}.json` | Popular by location | No |

**Common Query Parameters:**
- `limit` - Number of posts (max 100, default 25)
- `after` - Pagination token from previous response
- `before` - Pagination token (reverse)
- `t` - Time filter for top/controversial: `hour`, `day`, `week`, `month`, `year`, `all`
- `raw_json=1` - Avoid HTML encoding in response

### 2.2 Search Endpoints (GET)

| Endpoint | Description |
|----------|-------------|
| `/search.json` | Search all of Reddit |
| `/r/{subreddit}/search.json` | Search within subreddit |
| `/subreddits/search.json` | Search for subreddits |

**Query Parameters:**
- `q` - Search query
- `sort` - `relevance`, `hot`, `top`, `new`, `comments`
- `t` - Time filter
- `limit` - Max results
- `after` - Pagination

### 2.3 Post Detail Endpoints (GET)

| Endpoint | Description |
|----------|-------------|
| `/comments/{postId}.json` | Post + comments |
| `/by_id/{fullname}.json` - | Get specific post by fullname |

### 2.4 Interaction Endpoints (POST)

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `/api/vote` | Vote on post/comment | `id` (fullname), `dir` (1/0/-1) |
| `/api/hide` | Hide post | `id` (fullname) |
| `/api/unhide` | Unhide post | `id` (fullname) |
| `/api/save` | Save post | `id` (fullname) |
| `/api/unsave` | Unsave post | `id` (fullname) |

**Required Headers for POST:**
- `Content-Type: application/x-www-form-urlencoded`
- `x-modhash: {modhash}`
- `Cookie: token_v2={token}`

### 2.5 User Endpoints

| Endpoint | Description | Auth Required |
|----------|-------------|---------------|
| `/api/me.json` | Current user info + modhash | Yes |
| `/user/{username}/submitted.json` | User's posts | No |
| `/user/{username}/comments.json` | User's comments | No |
| `/user/{username}/about.json` | User profile | No |

### 2.6 Subreddit Endpoints

| Endpoint | Description |
|----------|-------------|
| `/r/{subreddit}/about.json` | Subreddit info |
| `/subreddits/default.json` | Default subreddits |
| `/subreddits/popular.json` | Popular subreddits |
| `/subreddits/new.json` | New subreddits |

---

## 3. Authentication Mechanisms

### 3.1 Cookie-Based Auth (Used by reddit-pi)

**Advantages:**
- No OAuth app registration required
- Simple to implement
- Direct access to personalized feeds (/best)
- Works with existing Reddit account

**Disadvantages:**
- Cookies expire (requires periodic refresh)
- Not officially supported for third-party apps
- Rate limits may be stricter
- Requires manual extraction or browser automation

**Cookie Extraction Process:**
1. Login to reddit.com in browser
2. Open DevTools → Application → Cookies → reddit.com
3. Copy `token_v2` value
4. Optional: Copy `reddit_session` as fallback

### 3.2 OAuth2 (Official API)

**Advantages:**
- Officially supported
- Higher rate limits
- Long-lived tokens
- Better for production apps

**Disadvantages:**
- Requires app registration
- More complex implementation
- User must authorize app

### 3.3 Public API (Unauthenticated)

**Advantages:**
- No auth required
- Simple for read-only use cases

**Disadvantages:**
- No personalized feeds
- Lower rate limits
- Can't vote/comment

---

## 4. Rate Limiting

### 4.1 Response Headers
```
X-Ratelimit-Used: 10
X-Ratelimit-Remaining: 50
X-Ratelimit-Reset: 60
```

### 4.2 Limits by Auth Type

| Auth Type | Requests/Minute |
|-----------|----------------|
| OAuth | 60 |
| Cookie-based | ~30-40 (estimated) |
| Unauthenticated | ~10-20 (estimated) |

### 4.3 Best Practices

1. **Always check rate limit headers**
2. **Implement exponential backoff on 429 errors**
3. **Add delays between paginated requests** (reddit-pi uses 1s)
4. **Cache responses to avoid repeated requests**
5. **Batch operations when possible**

### 4.4 Rate Limit Manager Pattern
```typescript
class RateLimitManager {
  private remaining: number = 60;
  private resetTime: number = 60;
  
  updateFromHeaders(headers: Headers) {
    this.remaining = parseInt(headers.get('x-ratelimit-remaining') || '60');
    this.resetTime = parseInt(headers.get('x-ratelimit-reset') || '60');
  }
  
  async waitIfNeeded() {
    if (this.remaining < 5) {
      await sleep(this.resetTime * 1000);
    }
  }
}
```

---

## 5. Even Hub Platform Constraints

### 5.1 Display Constraints
| Property | Value |
|----------|-------|
| Resolution | 576 × 288 px per eye |
| Color | 4-bit greyscale (16 shades of green) |
| Max containers/page | 12 (v0.0.9+) |
| Text max (startup) | 1000 chars |
| Text max (upgrade) | 2000 chars |
| Images max size | 288 × 144 px |
| Max list items | 20 |

### 5.2 Input Events
- `CLICK_EVENT` (0) - Single tap
- `DOUBLE_CLICK_EVENT` (3) - Double tap
- `SCROLL_TOP_EVENT` (1) - Scroll to top
- `SCROLL_BOTTOM_EVENT` (2) - Scroll to bottom

### 5.3 UI Patterns for Reddit Client

**Post List View:**
- Use `ListContainerProperty` for scrollable post list
- Each item shows: Title (truncated), Subreddit, Score
- Selection highlight for current post

**Post Detail View:**
- Text container for title (full width)
- Text container for content/selftext
- Separate view for comments

**Navigation Pattern:**
- Swipe forward = Next post / Scroll down
- Swipe backward = Previous post / Scroll up
- Single tap = Open comments / Select
- Double tap = Back / Menu

---

## 6. Architecture Recommendations

### 6.1 Client-Side Architecture (Even Hub App)

```
┌─────────────────────────────────────────────────────────────┐
│                    Reddit Client App                        │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Even Hub SDK)                                    │
│  ├── List views (posts, subreddits)                        │
│  ├── Detail views (post content)                           │
│  ├── Comment views                                         │
│  └── Navigation & menus                                    │
├─────────────────────────────────────────────────────────────┤
│  State Management                                           │
│  ├── Post cache (IndexedDB/localStorage)                   │
│  ├── User preferences                                      │
│  ├── Auth tokens (secure storage)                          │
│  └── Seen posts tracking                                   │
├─────────────────────────────────────────────────────────────┤
│  Reddit API Client                                          │
│  ├── Auth manager (cookie-based)                           │
│  ├── Rate limit handler                                    │
│  ├── Request queue                                         │
│  └── Response cache                                        │
├─────────────────────────────────────────────────────────────┤
│  Background Sync                                            │
│  ├── Periodic fetch (Service Worker/interval)              │
│  ├── Auto-refresh timer                                    │
│  └── Notification queue                                    │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Configuration Schema

```typescript
interface RedditClientConfig {
  // Authentication
  auth: {
    type: 'cookie' | 'oauth';
    tokenV2?: string;
    session?: string;
    userAgent: string;
  };
  
  // Feed settings
  feed: {
    defaultEndpoint: 'best' | 'hot' | 'new' | 'top' | 'rising';
    subreddits: string[];
    postsPerFetch: number;
    timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  };
  
  // Auto-refresh
  sync: {
    enabled: boolean;
    intervalMinutes: number;
    backgroundFetch: boolean;
  };
  
  // Caching
  cache: {
    maxPosts: number;
    expireAfterHours: number;
    cacheComments: boolean;
  };
  
  // UI preferences
  ui: {
    showThumbnails: boolean;
    compactView: boolean;
    defaultSort: string;
  };
}
```

### 6.3 Cache Strategy

**Multi-Level Caching:**
1. **Memory Cache** - Current session posts (Map)
2. **IndexedDB** - Persistent post storage with TTL
3. **LocalStorage** - User preferences, auth tokens
4. **Seen Posts Set** - Deduplication (Bloom filter or Set)

**Cache Keys:**
- `reddit:posts:{endpoint}:{params}` - Post listings
- `reddit:post:{id}` - Individual post details
- `reddit:comments:{postId}` - Comment threads
- `reddit:user:{id}` - User preferences

### 6.4 Security Considerations

1. **Never store plaintext passwords**
2. **Use localStorage for auth tokens** (encrypted if possible)
3. **Validate all Reddit responses**
4. **Sanitize user-generated content** (HTML entities)
5. **Rate limit client-side requests**

---

## 7. Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Project setup with Even Hub SDK
- [ ] Reddit API client with auth
- [ ] Rate limit manager
- [ ] Basic cache layer

### Phase 2: UI Implementation
- [ ] Post list view (ListContainer)
- [ ] Post detail view (TextContainer)
- [ ] Comment view
- [ ] Navigation controls

### Phase 3: Interactions
- [ ] Upvote/downvote
- [ ] Hide post
- [ ] View comments
- [ ] Save/unsave

### Phase 4: Background Sync
- [ ] Auto-refresh timer
- [ ] Background fetch
- [ ] Notification handling
- [ ] Offline support

### Phase 5: Polish
- [ ] Onboarding flow
- [ ] Configuration UI
- [ ] Error handling
- [ ] Documentation

---

## References

1. reddit-pi service: `C:\DEV\pi\services\reddit-pi`
2. Even Hub SDK: `@evenrealities/even_hub_sdk`
3. Reddit API Docs: https://www.reddit.com/dev/api/
4. Even Hub Research: `./even-hub-research.md`
