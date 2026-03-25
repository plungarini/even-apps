# Even Hub – Deep Research Reference

> **Last updated:** March 2026
>
> This document compiles research from the official Even Realities developer portal, the community-maintained `nickustinov/even-g2-notes` SDK reverse-engineering notes, npm package metadata, and Discord announcements. It is the primary reference for building apps in this repo.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Official Resources](#2-official-resources)
3. [SDK Packages & Versions](#3-sdk-packages--versions)
4. [Architecture & Connection Model](#4-architecture--connection-model)
5. [G2 Hardware Specs](#5-g2-hardware-specs)
6. [SDK Initialisation](#6-sdk-initialisation)
7. [UI Model — Containers](#7-ui-model--containers)
   - 7.1 [Canvas & Coordinate System](#71-canvas--coordinate-system)
   - 7.2 [Container Rules](#72-container-rules)
   - 7.3 [Text Containers](#73-text-containers)
   - 7.4 [List Containers](#74-list-containers)
   - 7.5 [Image Containers](#75-image-containers)
   - 7.6 [Font & Unicode Support](#76-font--unicode-support)
8. [Page Lifecycle](#8-page-lifecycle)
9. [Input Events](#9-input-events)
10. [Device APIs](#10-device-apis)
11. [Launch Sources (v0.0.9+)](#11-launch-sources-v009)
12. [IMU Hardware Control (v0.0.9+)](#12-imu-hardware-control-v009)
13. [UI Patterns](#13-ui-patterns)
14. [Development Workflow](#14-development-workflow)
15. [app.json Manifest](#15-appjson-manifest)
16. [CLI Reference (evenhub-cli)](#16-cli-reference-evenhub-cli)
17. [Simulator (even-dev)](#17-simulator-even-dev)
18. [Packaging & Distribution](#18-packaging--distribution)
19. [SDK Versions & Changelog](#19-sdk-versions--changelog)
20. [Error Codes](#20-error-codes)
21. [Known Quirks & Gotchas](#21-known-quirks--gotchas)
22. [Example Apps](#22-example-apps)

---

## 1. Platform Overview

**Even Realities** makes the G2 smart glasses — dual micro-LED display glasses (one lens per eye, no camera, no speaker) designed for privacy-focused always-on HUD use. They pair with an iPhone via BLE 5.x and are controlled with the R1 ring.

**Even Hub** is the app platform for the G2. Developers build web apps (TypeScript + Vite) that communicate with the glasses through the iPhone WebView bridge. Apps can be sideloaded for development and (eventually) published to the Even Hub portal.

### How apps run

```
[Developer Server / localhost]
        ↕ HTTPS/HTTP
[iPhone — Even App (Flutter)]
        ↕ BLE 5.x (~28m range)
[G2 Glasses — micro-LED display + touch + ring]
```

1. Your app is a standard web page hosted anywhere (Vercel, Cloudflare, localhost, VPS)
2. The iPhone opens your URL in a `flutter_inappwebview` WebView
3. The SDK injects `EvenAppBridge` into `window` — your JS calls this to control the glasses
4. The iPhone relays all messages to/from the glasses over BLE
5. The glasses render UI containers and emit input events back

**Implications:**
- Your backend can hold API keys, do heavy computation — the glasses are just a thin display
- Standard web security applies (HTTPS, server-side secrets, session tokens)
- The WebView has full browser capabilities: `fetch`, `localStorage`, `WebSockets`, etc.

---

## 2. Official Resources

| Resource | URL / Notes |
|---|---|
| **Even Realities website** | https://www.evenrealities.com |
| **Even Hub Developer Portal** | https://evenhub.evenrealities.com — early-access signup required |
| **Even Hub Discord** | https://discord.gg/GsuDkKDXDe — primary developer community, where SDK updates are announced |
| **Even Realities GitHub org** | https://github.com/even-realities |
| **Support Center** | https://support.evenrealities.com |
| **Community SDK notes** | https://github.com/nickustinov/even-g2-notes — independent reverse-engineering reference, NOT official |
| **even-dev simulator** | https://github.com/BxNxM/even-dev — community dev environment |

### Access Model

The Even Hub is in a **pilot program** (early access). To develop apps:

1. Apply at https://evenhub.evenrealities.com/application
2. Get accepted into the pilot cohort
3. Receive access to the developer portal and app submission

The npm packages (`even_hub_sdk`, `evenhub-cli`, `evenhub-simulator`) are publicly available and can be used without portal access for development and simulation.

---

## 3. SDK Packages & Versions

### Current versions (as of March 2026)

| Package | Version | Install |
|---|---|---|
| `@evenrealities/even_hub_sdk` | `0.0.9` | `npm install @evenrealities/even_hub_sdk@^0.0.9` |
| `@evenrealities/evenhub-cli` | `0.1.10` | `npm install -g @evenrealities/evenhub-cli@^0.1.10` |
| `@evenrealities/evenhub-simulator` | `0.6.2` | `npm install -D @evenrealities/evenhub-simulator@^0.6.2` |

### Update command (from Discord)

```bash
npm install @evenrealities/even_hub_sdk@^0.0.9
npm install -g @evenrealities/evenhub-cli@^0.1.10
npm install -D @evenrealities/evenhub-simulator@^0.6.2
```

### Package metadata

- `even_hub_sdk`: MIT license, ESM + CJS, full TypeScript types, zero production dependencies
- Maintainers: whiskee.chen, carson.zhu (Even Realities)
- First released: 2026-01-27

---

## 4. Architecture & Connection Model

### SDK Bridge

The SDK injects a `EvenAppBridge` object into the WebView's `window` via `flutter_inappwebview`'s native message passing (`callHandler('evenAppMessage', ...)`). This is **not HTTP** — it's a direct WebView-to-Flutter bridge.

### Two-way communication

| Direction | Mechanism |
|---|---|
| Web → Glasses | `bridge.callEvenApp(method, params)` → Flutter relays over BLE |
| Glasses → Web | BLE event → Flutter calls `window._listenEvenAppMessage(...)` → SDK fires your callback |

### Development flow

1. Build your web app importing `@evenrealities/even_hub_sdk`
2. During dev: run locally with `vite --host 0.0.0.0`; Even App loads `http://<your-ip>:5173`
3. For production: deploy to any static host; Even App loads from that URL

---

## 5. G2 Hardware Specs

| Feature | Details |
|---|---|
| Display | Dual micro-LED (green), 576 × 288 px per eye |
| Colour | 4-bit greyscale (16 shades of green) |
| Sync | Physical FPC between lenses (not wireless) |
| Connectivity | BLE 5.x — ~28m real-world range |
| Input | Touch gestures on temple tips, R1 ring (separate BLE device) |
| Sensors | IMU (accelerometer/gyroscope) — controllable via SDK v0.0.9+ |
| Microphone | Yes — accessible via SDK |
| Camera | None |
| Speaker | None |

---

## 6. SDK Initialisation

```typescript
import { waitForEvenAppBridge, EvenAppBridge } from '@evenrealities/even_hub_sdk'

// Method 1: async wait (recommended) — resolves when bridge is ready
const bridge = await waitForEvenAppBridge()

// Method 2: synchronous singleton — only after bridge already initialised
const bridge = EvenAppBridge.getInstance()
```

Always use `waitForEvenAppBridge()` at the top of `main.ts`. The bridge may not be immediately available on page load.

---

## 7. UI Model — Containers

### 7.1 Canvas & Coordinate System

- Canvas: **576 × 288 pixels** per eye
- Origin: top-left (0, 0)
- X increases right, Y increases down
- All colours are 4-bit greyscale — the host iPhone app converts everything before BLE transmission
- White pixels appear bright green on the micro-LED; black pixels are off (invisible)

### 7.2 Container Rules

| Rule | Detail |
|---|---|
| Max containers per page | **12** (as of v0.0.9 — previously 4) |
| Event capture | Exactly **one** container must have `isEventCapture: 1` |
| Container count | `containerTotalNum` must match actual container count passed |
| Overlap | Containers can overlap; later ones draw on top (no z-index control) |
| textObject limit | **8 items** per `CreateStartUpPageContainer` (v0.0.9+) |
| imageObject limit | **4 items** per `CreateStartUpPageContainer` (v0.0.9+) |

### Shared container properties

| Property | Type | Range | Notes |
|---|---|---|---|
| `xPosition` | number | 0–576 | Left edge in pixels |
| `yPosition` | number | 0–288 | Top edge in pixels |
| `width` | number | 0–576 | (20–200 for images — see below) |
| `height` | number | 0–288 | (20–100 for images — see below) |
| `containerID` | number | any | Unique per page; used for updates |
| `containerName` | string | max 16 chars | Unique per page; used for updates |
| `isEventCapture` | number | 0 or 1 | Exactly one must be 1 |

### 7.3 Text Containers

The primary container type. Renders plain left-aligned text.

```typescript
import { TextContainerProperty } from '@evenrealities/even_hub_sdk'

new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 4,
  containerID: 1,
  containerName: 'main',
  content: 'Hello G2!',
  isEventCapture: 1,
})
```

#### Text constraints

| Limit | Startup / Rebuild | textContainerUpgrade |
|---|---|---|
| Max content length | 1000 chars | 2000 chars |

#### Text behaviour

- Text wraps at container width
- Overflow with `isEventCapture: 1`: firmware scrolls internally; user can scroll with ring/swipe
- `SCROLL_TOP_EVENT` / `SCROLL_BOTTOM_EVENT` fire at scroll boundaries (not per gesture)
- `\n` works for line breaks
- No font selection, no font size, no bold/italic — single fixed-width-ish LVGL font
- No text alignment options (no centre, no right-align — pad with spaces to simulate)
- Unicode supported (see Section 7.6)
- ~400–500 chars fill a full-screen (576×288) text container

#### Border and decoration

| Property | Type | Range | Notes |
|---|---|---|---|
| `borderWidth` | number | 0–5 | 0 = no border |
| `borderColor` | number | 0–16 | Greyscale level; 5 = subtle, 13 = bright |
| `borderRdaius` | number | 0–10 | Rounded corners (note: SDK typo preserved from protobuf) |
| `paddingLength` | number | 0–32 | Uniform padding on all sides |

### 7.4 List Containers

Native scrollable list widget. Firmware handles scroll highlighting natively.

```typescript
import { ListContainerProperty, ListItemContainerProperty } from '@evenrealities/even_hub_sdk'

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
  containerName: 'menu',
  isEventCapture: 1,
  itemContainer: new ListItemContainerProperty({
    itemCount: 4,
    itemWidth: 560,
    isItemSelectBorderEn: 1,
    itemName: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
  }),
})
```

#### List constraints

| Property | Range | Notes |
|---|---|---|
| `itemCount` | 1–20 | Must match `itemName.length` |
| `itemWidth` | pixels | `0` = auto-fill; otherwise explicit px (usually `containerWidth - 2*padding`) |
| `isItemSelectBorderEn` | 0 or 1 | Show selection highlight |
| `itemName[]` | max 64 chars each | Plain text only |

#### List behaviour

- Firmware handles scrolling — no `rebuildPageContainer` needed for scroll
- `SCROLL_TOP_EVENT` / `SCROLL_BOTTOM_EVENT` only at boundary
- Click events report `currentSelectItemIndex` (0-based) and `currentSelectItemName`
- Cannot update items in-place — must `rebuildPageContainer` to change items
- No per-item styling, no separator lines, no icons

### 7.5 Image Containers

Displays greyscale images on the glasses.

```typescript
import { ImageContainerProperty, ImageRawDataUpdate } from '@evenrealities/even_hub_sdk'

// Step 1: Create placeholder at startup
new ImageContainerProperty({
  xPosition: 188,
  yPosition: 72,
  width: 200,
  height: 144,
  containerID: 2,
  containerName: 'img',
})

// Step 2: Send image data after page is created
const pngBytes = Array.from(new Uint8Array(await pngBlob.arrayBuffer()))
await bridge.updateImageRawData(new ImageRawDataUpdate({
  containerID: 2,
  containerName: 'img',
  imageData: pngBytes,
}))
```

#### Image constraints (v0.0.9+)

| Constraint | Value |
|---|---|
| Min dimensions | 20 × 20 px |
| Max dimensions | **288 × 144 px** (v0.0.9+; was 200 × 100 in earlier versions) |
| Colour depth | 4-bit greyscale (host converts automatically) |
| Accepted data formats | `number[]`, `Uint8Array`, `ArrayBuffer`, base64 PNG string |
| Concurrent sends | **Not allowed** — wait for one to complete before sending next |
| Startup data | Cannot send image data during `createStartUpPageContainer` — create empty placeholder, then `updateImageRawData` |
| Tiling | If image data is smaller than container, hardware tiles it — always match sizes |

#### Image processing best practices

1. Send greyscale images — colour is discarded by host 4-bit conversion
2. Do NOT manually dither — host's `imageToGray4` does better conversion
3. Resize to fit container preserving aspect ratio
4. Centre on black canvas (black = off on micro-LED)
5. Encode as PNG, send as `number[]` or base64
6. Keep images simple — 16-level greyscale loses detail quickly
7. Avoid frequent image updates — glasses memory is limited

### 7.6 Font & Unicode Support

The G2 firmware uses a single LVGL font. No font selection, no size control. Characters outside the font are silently skipped.

**Supported ranges:**

| Range | Coverage |
|---|---|
| ASCII + Latin-1 (U+0020–U+00FF) | Nearly complete (5 chars missing: `¨ ¯ ´ µ ¸`) |
| Arrows (U+2190–U+2199, U+21D2, U+21D4) | 12 chars: ← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇒ ⇔ |
| Box Drawing (U+2500–U+2573) | Single/heavy lines; dashed subsets missing |
| Block Elements (U+2581–U+2595) | Lower/left fractional blocks + full block |
| Geometric Shapes (U+25A0–U+25EF) | Selective: ■□▲△▶▷▼▽◀◁◆◇●○★☆ + more |
| Misc Symbols (U+2605–U+2667) | 13 chars: ★☆☉☎☏☜☞♠♡♣♤♥♧ |
| Superscripts/subscripts | ⁰¹²³⁴⁵⁶⁷⁸⁹ / ₀₁₂₃₄₅₆₇₈₉ |
| Copyright/trademark | © ® ™ |

**Useful characters for apps:**

```
Progress bars: ━ ─ █▇▆▅▄▃▂▁ ▉▊▋▌▍▎▏ ▒
Navigation:    ← → ↑ ↓ ▲ ▼
Selection:     ▶ ● ○ ■ □ ★ ☆
Box drawing:   ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ╭ ╮ ╯ ╰
```

**Not supported:** Emoji (U+1F300+), most weather symbols (☀☁☂⛄), dingbats, double-line box drawing (most of ╔╗╚╝), quadrant blocks (▖▗▘▙▚▛▜▝▞▟).

---

## 8. Page Lifecycle

### `createStartUpPageContainer`

Called **exactly once** at startup. Establishes the initial page layout.

```typescript
import { CreateStartUpPageContainer } from '@evenrealities/even_hub_sdk'

const result = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [textContainer],
    listObject: [],   // optional
    imageObject: [],  // optional
  })
)
// result: 0=success, 1=invalid, 2=oversize, 3=outOfMemory
```

Returns `StartUpPageCreateResult` (see Section 20).

### `rebuildPageContainer`

Replaces the entire page. Primary way to navigate between screens. Causes a brief flicker on real hardware.

```typescript
import { RebuildPageContainer } from '@evenrealities/even_hub_sdk'

await bridge.rebuildPageContainer(
  new RebuildPageContainer({
    containerTotalNum: 1,
    textObject: [newTextContainer],
  })
)
```

All containers are destroyed and recreated. Scroll position and list selection are lost. Returns `boolean`.

### `textContainerUpgrade`

Updates text content in-place without rebuilding the page. Faster and flicker-free on real hardware.

```typescript
import { TextContainerUpgrade } from '@evenrealities/even_hub_sdk'

await bridge.textContainerUpgrade(new TextContainerUpgrade({
  containerID: 1,
  containerName: 'main',
  contentOffset: 0,
  contentLength: previousContent.length,
  content: newContent,
}))
```

Requires matching `containerID` and `containerName`. Returns `boolean`.

### `updateImageRawData`

Updates image data for an existing image container placeholder.

```typescript
import { ImageRawDataUpdate } from '@evenrealities/even_hub_sdk'

// From PNG blob
const pngBytes = Array.from(new Uint8Array(await pngBlob.arrayBuffer()))
await bridge.updateImageRawData(new ImageRawDataUpdate({
  containerID: 2,
  containerName: 'img',
  imageData: pngBytes,
}))

// From canvas
const base64 = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
await bridge.updateImageRawData(new ImageRawDataUpdate({
  containerID: 2,
  containerName: 'img',
  imageData: base64,
}))
```

Returns `ImageRawDataUpdateResult`. Do not send concurrent image updates.

### `shutDownPageContainer`

Exits the app.

```typescript
await bridge.shutDownPageContainer(0) // 0 = immediate exit
await bridge.shutDownPageContainer(1) // 1 = show exit confirmation to user
```

### `callEvenApp` (escape hatch)

Low-level method to call any native Even App function by name.

```typescript
import { EvenAppMethod } from '@evenrealities/even_hub_sdk'

const user = await bridge.callEvenApp(EvenAppMethod.GetUserInfo)
const result = await bridge.callEvenApp('someUndocumentedMethod', { param: 'value' })
```

| EvenAppMethod enum | Native method |
|---|---|
| `GetUserInfo` | `'getUserInfo'` |
| `GetGlassesInfo` | `'getGlassesInfo'` |
| `SetLocalStorage` | `'setLocalStorage'` |
| `GetLocalStorage` | `'getLocalStorage'` |
| `CreateStartUpPageContainer` | `'createStartUpPageContainer'` |
| `RebuildPageContainer` | `'rebuildPageContainer'` |
| `UpdateImageRawData` | `'updateImageRawData'` |
| `TextContainerUpgrade` | `'textContainerUpgrade'` |
| `AudioControl` | `'audioControl'` |
| `ShutDownPageContainer` | `'shutDownPageContainer'` |

---

## 9. Input Events

### Event types (`OsEventTypeList`)

| Event | Value | Description |
|---|---|---|
| `CLICK_EVENT` | 0 | Ring tap or temple tap |
| `SCROLL_TOP_EVENT` | 1 | User reached top of scrollable content |
| `SCROLL_BOTTOM_EVENT` | 2 | User reached bottom of scrollable content |
| `DOUBLE_CLICK_EVENT` | 3 | Ring double-tap or temple double-tap |
| `FOREGROUND_ENTER_EVENT` | 4 | App came to foreground |
| `FOREGROUND_EXIT_EVENT` | 5 | App went to background |
| `ABNORMAL_EXIT_EVENT` | 6 | Unexpected disconnect |

### Receiving events

```typescript
bridge.onEvenHubEvent((event) => {
  const { listEvent, textEvent, sysEvent, audioEvent } = event

  if (listEvent) {
    // item selected in a list container
    console.log(listEvent.currentSelectItemName, listEvent.currentSelectItemIndex)
  }

  if (textEvent) {
    const type = textEvent.eventType
    if (type === OsEventTypeList.CLICK_EVENT || type === undefined) {
      // click (undefined = CLICK_EVENT = 0, SDK quirk)
    }
    if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      // scroll down boundary
    }
  }

  if (sysEvent) {
    // foreground/background changes, abnormal exit
  }

  if (audioEvent) {
    // PCM audio data — audioEvent.audioPcm (Uint8Array)
  }
})
```

### Event payload types

**`EvenHubEvent`:**
```typescript
{
  listEvent?: {
    containerID: number
    containerName: string
    currentSelectItemName: string
    currentSelectItemIndex: number
    eventType: OsEventTypeList
  }
  textEvent?: {
    containerID: number
    containerName: string
    eventType: OsEventTypeList
  }
  sysEvent?: {
    eventType: OsEventTypeList
  }
  audioEvent?: {
    audioPcm: Uint8Array
  }
  jsonData?: Record<string, any>
}
```

---

## 10. Device APIs

### Device info

```typescript
const device = await bridge.getDeviceInfo()
// device.model          — DeviceModel.G1 | DeviceModel.G2 | DeviceModel.Ring1
// device.sn             — serial number string
// device.status.connectType     — DeviceConnectType enum
// device.status.batteryLevel    — 0–100
// device.status.isWearing       — boolean
// device.status.isCharging      — boolean
// device.status.isInCase        — boolean
```

Real-time monitoring:

```typescript
const unsubscribe = bridge.onDeviceStatusChanged((status) => {
  console.log(status.batteryLevel, status.isWearing)
})
// Call unsubscribe() to stop listening
```

### User info

```typescript
const user = await bridge.getUserInfo()
// user.uid     — number
// user.name    — string
// user.avatar  — string (URL)
// user.country — string
```

### Local storage (persisted on iPhone)

```typescript
await bridge.setLocalStorage('key', 'value')  // returns boolean
const value = await bridge.getLocalStorage('key')  // returns string
```

### Audio (microphone)

```typescript
await bridge.audioControl(true)   // open microphone
await bridge.audioControl(false)  // close microphone
```

Requires `createStartUpPageContainer` to be called first. PCM arrives via `onEvenHubEvent` as `audioEvent.audioPcm` (`Uint8Array`).

**PCM format:** 16 kHz sample rate, 10ms frame length, 40 bytes per frame, PCM S16LE (signed 16-bit little-endian), mono.

### SDK limitations

The SDK does **not** expose:

- Direct BLE access
- Arbitrary pixel drawing (limited to container model)
- `imgEvent` (defined in protocol but not in types)
- Audio output (no speaker)
- Text alignment (no centre/right-align)
- Font size, weight, or family
- Background colour or container fill
- Per-item styling in lists
- Programmatic scroll position control
- Animations or transitions

---

## 11. Launch Sources (v0.0.9+)

SDK v0.0.9 adds **Launch Source Listening**: detect whether the app was launched from the `appMenu` (the glasses app menu) or the `glassesMenu` (accessed directly on the glasses).

This allows apps to present different initial screens or behaviour based on how the user opened the app.

**Status:** The SDK types and exact API shape for this feature were released in v0.0.9. Monitor the `@evenrealities/even_hub_sdk` changelog and Discord announcements for the specific method name and payload shape.

Expected usage pattern (speculative based on SDK v0.0.9 description):

```typescript
// Likely arrives as a launch event or a field on the bridge
// Check Discord / npm changelog for exact API
```

---

## 12. IMU Hardware Control (v0.0.9+)

SDK v0.0.9 adds **IMU Hardware Control**: on/off control and live IMU data push events.

The G2 has an accelerometer/gyroscope (IMU). The new API allows:
- Enabling/disabling the IMU sensor
- Receiving real-time orientation/motion data via `onEvenHubEvent`

**Status:** Released in v0.0.9. Monitor `@evenrealities/even_hub_sdk` types and Discord for the specific method names (`bridge.imuControl(true/false)` or similar) and the `imuEvent` payload shape.

Potential use cases: motion-controlled navigation, orientation-aware UIs, activity detection.

---

## 13. UI Patterns

### Pattern: Fake button menu with cursor

Since there are no button widgets, simulate menus with text containers and a `>` cursor:

```typescript
let selectedIndex = 0
const items = ['Action 1', 'Action 2', 'Return']

function renderMenu() {
  const content = items.map((item, i) =>
    `${i === selectedIndex ? '▶ ' : '  '}${item}`
  ).join('\n')
  // update via textContainerUpgrade
}
```

Scroll events move the cursor; click triggers the selected action.

### Pattern: Progress bar with Unicode

```typescript
function progressBar(percent: number, width: number = 30): string {
  const filled = Math.round(percent / 100 * width)
  return '━'.repeat(filled) + '─'.repeat(width - filled)
}
// "━━━━━━━━━━────────────" for 33%
```

### Pattern: Image-based app with event capture

Image containers don't receive events. Use a hidden full-screen text container behind the image:

```typescript
const config = new CreateStartUpPageContainer({
  containerTotalNum: 2,
  textObject: [
    new TextContainerProperty({
      containerID: 1,
      containerName: 'evt',
      content: ' ',
      xPosition: 0, yPosition: 0,
      width: 576, height: 288,
      isEventCapture: 1,
      paddingLength: 0,
    }),
  ],
  imageObject: [
    new ImageContainerProperty({
      containerID: 2,
      containerName: 'screen',
      xPosition: 188, yPosition: 72,  // centred: (576-200)/2, (288-144)/2
      width: 200, height: 144,
    }),
  ],
})
```

Events arrive as `textEvent`. The image renders on top (higher containerID).

### Pattern: Manual text pagination

For long content, pre-paginate at word boundaries rather than relying on firmware scroll:

```typescript
function paginate(text: string, charsPerPage = 400): string[] {
  const words = text.split(' ')
  const pages: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).length > charsPerPage) {
      pages.push(current.trim())
      current = word
    } else {
      current += ' ' + word
    }
  }
  if (current.trim()) pages.push(current.trim())
  return pages
}
```

Track `pageIndex`, rebuild on `SCROLL_BOTTOM_EVENT` / `SCROLL_TOP_EVENT`. Show page indicator (`Page 2/5`) in a header text container.

### Pattern: Multi-slot layout (simulated rows)

Use multiple text containers as visual rows:

```typescript
// 3 rows of equal height (96px each = 288 total)
const rows = [0, 1, 2].map((i) =>
  new TextContainerProperty({
    xPosition: 0,
    yPosition: i * 96,
    width: 576,
    height: 96,
    containerID: i + 1,
    containerName: `row${i}`,
    isEventCapture: i === 0 ? 1 : 0,
    content: rowContent[i],
    borderWidth: i === selected ? 2 : 0,
    borderColor: 13,
  })
)
```

---

## 14. Development Workflow

### Day-to-day development

```bash
cd apps/<app-name>
npm install

# Terminal 1: Vite dev server
npm run dev
# → http://0.0.0.0:5173 (also shows network URL like http://192.168.x.x:5173)

# Terminal 2: QR code for sideloading
npm run qr
# → Scan with the Even App on your iPhone
```

Vite hot-reload works when code changes. The glasses display updates automatically.

### Running in the simulator (no glasses needed)

```bash
# Option 1: even-dev community tool
git clone https://github.com/BxNxM/even-dev.git
cd even-dev && npm install
APP_PATH=../apps/<app-name> ./start-even.sh

# Option 2: Register your app in even-dev's apps.json
echo '{"my-app": "../apps/<app-name>"}' > apps.json
./start-even.sh
```

The simulator opens in the browser and renders a fake G2 display. Useful for iterating UI without glasses.

### Backend server (optional)

If your app needs a backend (API proxying, server-side logic, database):

```
apps/<app-name>/
└── server/
    ├── package.json    # Backend dependencies (separate npm project)
    └── src/
        └── index.ts    # Backend entry point (Node.js / Fastify / Express)
```

`even-dev` auto-detects and starts the `server/` directory alongside Vite. For standalone use, start it manually.

---

## 15. `app.json` Manifest

Required at the app root for CLI packaging and portal submission.

```json
{
  "package_id": "com.plungarini.appname",
  "edition": "202601",
  "name": "App Display Name",
  "version": "1.0.0",
  "min_app_version": "0.1.0",
  "tagline": "Short description shown in Even Hub",
  "description": "Longer description of what the app does.",
  "author": "Pietro Lungarini",
  "entrypoint": "index.html",
  "permissions": {
    "network": ["api.example.com"],
    "fs": ["./assets"]
  }
}
```

### `package_id` rules

- Reverse-domain format: `com.example.myapp`
- Each segment: starts with lowercase letter, contains only lowercase letters or digits
- **No hyphens** — `com.my-name.app` is invalid; `com.myname.app` is valid

### `permissions.network`

List the domains your app needs to call. Use `["*"]` for unrestricted network access (apps that connect to user-configured servers).

---

## 16. CLI Reference (evenhub-cli)

Install globally or per-project:

```bash
npm install -g @evenrealities/evenhub-cli@^0.1.10
# or locally:
npm install -D @evenrealities/evenhub-cli@^0.1.10
# Use via: npx evenhub <command>
```

Provides two binaries: `evenhub` and `eh` (alias).

### Commands

#### `evenhub init`

Generate a starter `app.json` manifest:

```bash
evenhub init
```

#### `evenhub login`

Authenticate with your Even Hub developer account:

```bash
evenhub login
# Prompts for email and password; credentials saved locally
```

#### `evenhub qr`

Generate a QR code to scan with the Even App for sideloading your dev server:

```bash
# Recommended: specify full URL
evenhub qr --url "http://192.168.0.100:5173"

# Build from parts
evenhub qr --http --port 5173
evenhub qr --http --ip 192.168.0.100 --port 5173

# Reset cached settings
evenhub qr --clear
```

| Option | Description |
|---|---|
| `--url <url>` | Full URL to encode (ignores other options) |
| `--ip <ip>` | IP address or hostname |
| `--port <port>` | Port number |
| `--http` / `--https` | Scheme (default: HTTPS) |
| `--path <path>` | URL path |
| `--external` | Open QR in external app instead of terminal |
| `--clear` | Clear cached scheme/IP/port/path |

**Important:** Use your machine's LAN IP (`192.168.x.x`), **not** `localhost` or `0.0.0.0`. The phone needs to reach your dev server over the network.

#### `evenhub pack`

Package a built app into a `.ehpk` file:

```bash
vite build
evenhub pack app.json dist -o myapp.ehpk
```

| Option | Description |
|---|---|
| `<json>` | Path to `app.json` (required) |
| `<project>` | Path to built output folder, e.g. `dist` (required) |
| `-o, --output <name>` | Output filename (default: `out.ehpk`) |
| `--no-ignore` | Include hidden files (starting with `.`) |
| `-c, --check` | Check if the `package_id` is available on Even Hub |

---

## 17. Simulator (even-dev)

**even-dev** is a community-maintained development environment for testing G2 apps without real glasses. It provides app discovery, dependency management, Vite configuration, and the official `@evenrealities/evenhub-simulator`.

Repository: https://github.com/BxNxM/even-dev

### Setup

```bash
git clone https://github.com/BxNxM/even-dev.git
cd even-dev
npm install
./start-even.sh
```

### Running your app

```bash
# By path (no config needed)
APP_PATH=../apps/<app-name> ./start-even.sh

# By name (after registering in apps.json)
APP_NAME=<app-name> ./start-even.sh

# Interactive menu
./start-even.sh
```

### Registering external apps

Create/edit `apps.json` at the `even-dev` root:

```json
{
  "my-app": "../apps/my-app",
  "chess": "https://github.com/dmyster145/EvenChess"
}
```

Git URLs are auto-cloned on first run. Local paths are used directly.

### even-dev project structure

```
even-dev/
├── apps.json              # External app registry
├── start-even.sh          # Main launcher script
├── apps/                  # Built-in reference apps
├── scripts/               # Helper scripts
└── vite-plugins/          # Custom Vite plugins for app registry
```

### CSS frameworks in even-dev

If your app uses Tailwind or path aliases, place a `vite-plugin.ts` in your app root — `even-dev` injects it into the shared Vite instance. This is **not** needed for standalone `npm run dev`.

---

## 18. Packaging & Distribution

### Build & package

```bash
npm run build          # Vite build → dist/
evenhub pack app.json dist -o myapp.ehpk
```

The `.ehpk` format bundles your built app for Even Hub portal submission.

### Portal submission

The Even Hub portal for app submission is **not yet publicly available** (as of March 2026). You must be in the pilot program. Monitor Discord and https://evenhub.evenrealities.com for updates.

### `.gitignore` entries (required)

```
dist/
*.ehpk
node_modules/
```

---

## 19. SDK Versions & Changelog

### v0.0.9 (2026-03-25)

Announced via Discord:

- **Launch Source Listening:** Detect whether app was launched via `appMenu` or `glassesMenu`
- **Expanded UI Containers:** Startup container creation limit raised from 4 to **12**
- **textObject** supports up to **8 items** per page build
- **imageObject** capped at **4 items** per page build
- **Bigger Images:** Max image size increased to **288 × 144 px** (was 200 × 100)
- **IMU Hardware Control:** On/off control and live IMU data push events
- **Bug Fix:** Fixed `radius` spelling error (SDK previously used `borderRdaius` — this was a protobuf typo preserved from firmware; v0.0.9 status unclear, check types)

Update commands:
```bash
npm install @evenrealities/even_hub_sdk@^0.0.9
npm install -D @evenrealities/evenhub-cli@^0.1.10
npm install -D @evenrealities/evenhub-simulator@^0.6.2
```

### v0.0.8 (2026-03-25)

Immediate predecessor to v0.0.9 (same release date — incremental update).

### v0.0.7 (2026-02-11)

- First broadly-used version; referenced in community docs and examples
- Image max: 200 × 100 px
- Container limit: 4 per page

### v0.0.3–v0.0.6 (2026-01-27–2026-01-28)

- Initial releases

---

## 20. Error Codes

### `StartUpPageCreateResult` (from `createStartUpPageContainer`)

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Invalid container configuration |
| 2 | Oversize — data too large for BLE transfer |
| 3 | Out of memory on glasses |

### `rebuildPageContainer` / `textContainerUpgrade` / `shutDownPageContainer`

Returns `boolean`. Internal SDK codes:

- `APP_REQUEST_REBUILD_PAGE_SUCCESS` / `APP_REQUEST_REBUILD_PAGE_FAILD` (sic — typo in SDK)
- `APP_REQUEST_UPGRADE_TEXT_DATA_SUCCESS` / `APP_REQUEST_UPGRADE_TEXT_DATA_FAILED`
- `APP_REQUEST_UPGRADE_SHUTDOWN_SUCCESS` / `APP_REQUEST_UPGRADE_SHUTDOWN_FAILED`

### `ImageRawDataUpdateResult`

| Code | Meaning |
|---|---|
| `success` | OK |
| `imageException` | Image processing error |
| `imageSizeInvalid` | Dimensions out of range or don't match container |
| `imageToGray4Failed` | Greyscale conversion failed |
| `sendFailed` | BLE send failed |

---

## 21. Known Quirks & Gotchas

| Quirk | Detail |
|---|---|
| `CLICK_EVENT = 0` → `undefined` | SDK `fromJson` normalises `0` to `undefined`. Always check `type === CLICK_EVENT \|\| type === undefined`. |
| Missing `currentSelectItemIndex` | Simulator (and sometimes hardware) omits index for first item (index 0). Track selection in app state as fallback. |
| `borderRdaius` typo | The SDK uses `borderRdaius` (not `borderRadius`) — a typo from the firmware protobuf that is intentionally preserved. v0.0.9 reportedly fixes the typo but check SDK types before changing. |
| Simulator vs hardware events | Simulator sends `sysEvent` for button clicks; real hardware sends `textEvent` or `listEvent`. Handle all three. |
| Scroll event throttling | Scroll events can fire rapidly. Use a ~300ms cooldown to prevent double-actions. |
| List scroll takeover | A list container with `isEventCapture: 1` routes all scroll events as `listEvent`. If you also have a text container, it won't receive scroll events. |
| Image container tiling | If `imageData` dimensions are smaller than the container, hardware tiles the image. Always match image size to container size. |
| No concurrent image sends | Sending `updateImageRawData` while a previous one is in-flight causes errors. Await each call. |
| Image data at startup | Cannot send image data during `createStartUpPageContainer`. Create an empty placeholder and send data in the next tick via `updateImageRawData`. |
| Vite host binding | Set `--host 0.0.0.0` or `server.host: true` in Vite config. Otherwise the dev server is localhost-only and the phone cannot reach it. |
| `package_id` hyphens | `com.my-name.app` will fail `evenhub pack` validation. Use only `[a-z][a-z0-9]*` per segment. |

---

## 22. Example Apps

Useful references for building Even Hub apps:

| App | Repo | Notable For |
|---|---|---|
| **chess** | https://github.com/dmyster145/EvenChess | Tests, linting, modular architecture — best overall reference |
| **reddit** | https://github.com/fuutott/rdt-even-g2-rddit-client | `app.json` packaging, API proxy, evenhub-cli integration |
| **weather** | https://github.com/nickustinov/weather-even-g2 | Settings UI with even-toolkit, `vite-plugin.ts` for even-dev |
| **tesla** | https://github.com/nickustinov/tesla-even-g2 | Image-based rendering, backend server in `server/` |
| **pong** | https://github.com/nickustinov/pong-even-g2 | Canvas-rendered game via image container |
| **snake** | https://github.com/nickustinov/snake-even-g2 | Canvas-rendered game via image container |

### Community tools

| Tool | Repo | Notes |
|---|---|---|
| **even-dev** | https://github.com/BxNxM/even-dev | Multi-app simulator environment |
| **even-toolkit** | https://github.com/fabioglimb/even-toolkit | UI component library for browser settings pages |
| **awesome-even-g1** | https://github.com/galfaroth/awesome-even-realities-g1 | List of community projects (G1 era, some applicable to G2) |

---

*This document was compiled from: community SDK reverse-engineering notes (nickustinov/even-g2-notes), npm package metadata, official Even Hub developer portal content, and Discord SDK release announcements. Not all information is officially documented — treat sections marked as speculative or reverse-engineered accordingly.*
