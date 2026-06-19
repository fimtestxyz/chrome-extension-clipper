---
title: Gobble Backend Integration Design
date: 2026-06-19
author: Claude Code
status: Approved
---

# Gobble Backend Integration Design

## Overview

Add backend forwarding capability to the Gobble Chrome extension, enabling users to extract webpage content and send it to a configurable backend API. This design borrows proven patterns from the `chrome_extension_receiver` project (CDP capture, offline queue, retry logic).

## Goals

- Trigger capture via keyboard shortcut (`Cmd+B` by default).
- Send standardized JSON payload to a configurable backend API.
- Store a local copy of each capture for history and retry.
- Provide offline resilience with automatic retry on failure.
- Allow multiple backend profiles (dev, staging, production).

## Non-Goals

- Real-time WebSocket streaming.
- Authentication/OAuth to backend (handled separately).
- Content transformation beyond raw extraction (formatting happens on backend).

## Architecture

### Approach: Direct Service Worker Forwarding

The content script extracts content and sends it to the background service worker, which handles all I/O (network dispatch, local storage, retry queue).

**Data Flow:**
```
Floating Button / Shortcut
  → Content Script (extract DOM)
    → Background Worker (wrap payload)
      → [Backend API] ←→ [Local History]
                              ↑
                        [Offline Queue + Retry Timer]
```

### Components

#### 1. Trigger System (`content.js` + `manifest.json`)
- Register shortcut `_execute_action` in `manifest.json.commands`.
- Shortcut sends a message to the active tab's content script.
- Content script runs extraction and returns result via `sendMessage`.
- Floating button shows status feedback (spinner → ✓/✗ → reset).

#### 2. Payload Envelope (`background.js`)
Standardized JSON sent to backend:
```json
{
  "profile": "Local Dev",
  "timestamp": 1718800000000,
  "tab": {
    "id": 123,
    "title": "Page Title",
    "url": "https://example.com/page"
  },
  "content": {
    "raw": "...",
    "format": "json"
  },
  "metadata": {
    "extractedAt": "2026-06-19T12:00:00Z",
    "extractorVersion": "1.0.0"
  }
}
```

#### 3. Backend Profiles (`options.html` + `options.js`)
- CRUD for profiles: name, URL, endpoint, enabled toggle, default radio.
- Default backend URL: `http://localhost:6666`.
- Stored in `chrome.storage.local` under `gobble_backend_profiles`.
- Active profile settings merged into payload `profile` field.

#### 4. API Forwarding (`background.js`)
- `fetch()` POST to `baseUrl + endpoint` with JSON body.
- On success: store in history, show "✓ Sent" on button.
- On failure: enqueue in offline queue (retry later).

#### 5. Offline Queue (`queue-manager.js`)
- Borrowed from `chrome_extension_receiver`.
- Failed payloads stored in `chrome.storage.local` under `gobble_capture_queue`.
- Exponential backoff: `2^attempts * 1000ms`, max 5 attempts.
- Retry timer: runs every 30 seconds in background worker.
- Queue size configurable in options (default 200).

#### 6. Local History (`history.html` + `history.js`)
- Chronological list of captures with metadata.
- Shows: tab title, URL, timestamp, send status, profile name.
- Actions: Retry, Delete, Clear All.
- Filter/search by profile, date range, URL.
- Pagination for large histories.
- Stored in `chrome.storage.local` under `gobble_history`.
- Retention limit configurable in options (default 200).

#### 7. Floating Button Feedback (`content.js` + `content.css`)
- States: Idle → Capturing (spinner) → Sent (green ✓) → Failed (red ✗) → Idle.
- Queue badge: small counter showing pending items.
- Settings gear icon: link to `options.html`.

### File Structure

```
chrome_extension_clipper/
├── manifest.json              # Modified: +commands
├── background.js              # Modified: +forwardToApi, queue logic
├── content.js                 # Modified: +feedback, +shortcut listener
├── content.css                # Modified: +spinner, +badge, +status colors
├── popup.html                 # Unchanged
├── popup.js                   # Unchanged
├── popup.css                  # Unchanged
├── options.html               # Modified: +Backend Profiles section
├── options.js                 # New: Profile CRUD, queue limit config
├── history.html               # New: History page
├── history.js                 # New: History rendering, retry/delete
├── queue-manager.js           # New: Queue logic (from receiver)
├── TURNDOWN_CODE.js           # Unchanged
├── icons/                     # Unchanged
└── create_icon_*.py           # Unchanged
```

### Storage Keys

| Key | Purpose | Default Limit |
|-----|---------|---------------|
| `gobble_backend_profiles` | Backend profile configs | N/A |
| `gobble_capture_queue` | Failed payloads for retry | 200 |
| `gobble_history` | Local capture history | 200 |
| `gobble_prefs` | Existing user preferences | N/A |

### Error Handling

- **Network failure**: Enqueue payload, retry with exponential backoff.
- **Non-2xx response**: Enqueue payload (same as network failure).
- **Queue full**: Drop oldest items (FIFO).
- **Max retry attempts exceeded**: Drop item, mark as failed in history.
- **Content script injection failure**: Show "Failed" on button, log error.

### Success Criteria

1. User presses `Cmd+B` → extraction triggers → payload sent to backend.
2. Backend unreachable → payload queued → auto-retries every 30s.
3. User can open `history.html` → see all captures with status.
4. User can configure multiple backend profiles in `options.html`.
5. Floating button shows clear status feedback (capturing → sent/failed).
