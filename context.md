# Kalvium Outreach — Complete Project Context

> **Purpose of this file**: Provide enough detail about every file, function, data structure, and data flow that an AI assistant can understand the entire system without reading source code. If you are an AI reading this, you should NOT need to open any other file to understand how the app works.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Monorepo Structure (File Tree)](#2-monorepo-structure)
3. [Mobile App (`app/`) — Full Detail](#3-mobile-app)
4. [Web Dashboard (`website/`) — Full Detail](#4-web-dashboard)
5. [Webhook Server (`webhook-server/`) — Full Detail](#5-webhook-server)
6. [Firestore Database Schema (All Collections)](#6-firestore-database-schema)
7. [External Services & APIs](#7-external-services)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Known Bugs](#9-known-bugs)
10. [Design & Style Conventions](#10-design-conventions)

---

## 1. System Overview

**What it does**: A CRM companion system for Kalvium's field outreach team. Executives visit schools in person to promote Kalvium. The system tracks their location, logs their visits (walk-ins, meetings, seminars), records audio notes, and syncs everything with the external LeadSquared (LSQ) CRM.

**Three components**:
- **Mobile App** (`app/`): React Native (Expo) — Used by field executives on Android.
- **Web Dashboard** (`website/`): React (Vite) — Used by Team Leads and Admins.
- **Webhook Server** (`webhook-server/`): Node.js (Firebase Functions v2) — Syncs data between Firestore and LeadSquared CRM.

**Shared Backend**: Firebase (Auth, Firestore, Cloud Storage). All three components talk to the same Firebase project (`kalvium-outreach-53f54`).

**External CRM**: LeadSquared (LSQ). The system focuses on `ActivityEvent: 232` (Outreach Activity) which represents school visits with ~37 custom fields (`mx_Custom_1` through `mx_Custom_37`).

---

## 2. Monorepo Structure

```
kalvium-outreach/
├── app/                          # React Native (Expo) mobile app
│   ├── App.tsx                   # Root component: splash, fonts, navigation, auth init
│   ├── index.ts                  # Entry point (registers App)
│   ├── package.json              # Expo 56, React Native 0.85, React 19
│   ├── app.json                  # Expo config
│   ├── babel.config.js           # Module resolver aliases (@/ -> components/)
│   ├── firebase.json             # Firebase config for the app
│   ├── google-services.json      # Android Firebase config
│   ├── assets/                   # LOGO.png, LOGOsmall.png, icons
│   ├── components/ui/            # Gluestack UI components (badge, box, button, card, etc.)
│   └── src/
│       ├── components/
│       │   ├── dashboard/        # 9 sub-components for DashboardScreen
│       │   ├── meeting-notes/    # RecordingItem, PushToLsModal
│       │   └── tasks/            # TaskList, TaskTabs
│       ├── hooks/                # 7 custom hooks
│       ├── navigation/           # 3 navigators (Root, Auth, Executive)
│       ├── screens/
│       │   ├── auth/             # LoginScreen, OTPScreen
│       │   └── executive/        # DashboardScreen, LeadsScreen, MeetingNotesScreen,
│       │                         # TasksScreen, Activity232FormScreen
│       ├── services/             # auth, firebase, firestore, headlessTask, recording, storage
│       ├── stores/               # authStore (Zustand)
│       ├── tracking/             # locationTracker, motionDetector, visitTracker, firestoreSync,
│       │                         # useOutreachTracking
│       └── types/                # TypeScript interfaces and navigation types
│
├── website/                      # React (Vite) web dashboard
│   ├── src/
│   │   ├── App.tsx               # Routes: /, /pipeline, /analytics, /login
│   │   ├── firebase.ts           # Firebase web SDK init (primary + secondary app)
│   │   ├── main.tsx              # React root render
│   │   ├── pages/                # Dashboard, Pipeline, Analytics, Login
│   │   ├── components/
│   │   │   ├── dashboard/        # TeamSidebar, GlobalStats, AssociateHeader,
│   │   │   │                     # AssociateMap, AssociateTimeline, AssignTaskModal
│   │   │   ├── pipeline/         # PipelineBoard, PipelineSeminars, SchoolDetailSheet,
│   │   │   │                     # PipelineFilterPopover, types.ts
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── AnalyticsTab.tsx
│   │   │   ├── CrmActivityCard.tsx
│   │   │   └── TimelineActivityDialog.tsx
│   │   ├── hooks/                # use-toast.ts
│   │   ├── stores/               # authStore (Zustand)
│   │   └── lib/                  # utils.ts (cn helper)
│   └── package.json              # Vite 8, React 19, Tailwind CSS 3, Leaflet, Recharts
│
├── webhook-server/               # Firebase Functions v2 backend
│   ├── server.js                 # Entry point: Cloud Function exports only (~50 lines)
│   ├── config.js                 # Firebase Admin, env vars, constants
│   ├── lsq.js                    # LSQ API: fetch, parse, build Firestore doc
│   ├── sync.js                   # Sync engine (LSQ → Firestore)
│   ├── routes.js                 # Express HTTP routes (health, sync-now, leads, push-recording)
│   ├── pushQueue.js              # Firestore-triggered queue processor
│   ├── config.env                # LSQ_ACCESS_KEY, LSQ_SECRET_KEY
│   └── package.json
│
├── serviceAccountKey.json        # Firebase Admin credentials (gitignored in prod)
├── firebase.json                 # Root Firebase config
└── context.md                    # THIS FILE
```

---

## 3. Mobile App (`app/`) — Full Detail

### 3.1 Tech Stack
| Concern | Library |
|---|---|
| Framework | Expo SDK 56, React Native 0.85, React 19 |
| UI Components | `@gluestack-ui/core` (Box, VStack, HStack, Text, Button, Input, Card, Spinner, etc.) |
| Styling | NativeWind v5 (Tailwind CSS for RN) + `global.css` |
| State Management | Zustand v5 |
| Navigation | React Navigation v7 (`@react-navigation/native-stack`, `@react-navigation/bottom-tabs`) |
| Auth | `@react-native-firebase/auth` (email/password + phone OTP) |
| Database | `@react-native-firebase/firestore` (offline persistence enabled) |
| Storage | Cloudinary (via XHR upload, NOT Firebase Storage for uploads) |
| Location | `expo-location` (foreground + background tracking) |
| Sensors | `expo-sensors` (Accelerometer for motion detection) |
| Audio | `expo-audio` (meeting recording) |
| Background Tasks | `expo-task-manager`, `expo-background-fetch` |
| Icons | `lucide-react-native` |
| Animations | `react-native-reanimated` v4 |
| Date Utils | `date-fns` |
| Crypto | `expo-crypto` (for UUID generation) |

### 3.2 Entry Point — `App.tsx`
1. Hides native splash screen, shows a custom animated splash (LOGO fade-in for 3 seconds).
2. Calls `useAuthStore().initialize()` which sets up a Firebase `onAuthStateChanged` listener.
3. Calls `cleanupOldRecordings()` to delete `.m4a` files older than 7 days from local disk.
4. Calls `registerBackgroundFetchAsync()` to register a 15-minute background location task.
5. Loads Inter font family via `@expo-google-fonts/inter`.
6. Wraps everything in: `GluestackUIProvider` > `GestureHandlerRootView` > `SafeAreaProvider` > `NavigationContainer` > `RootNavigator`.
7. Theme: primary = `#E11D48` (crimson), background = `#FAF8F5` (warm off-white).

### 3.3 Navigation
- **`RootNavigator`** (`src/navigation/RootNavigator.tsx`): If `isLoading` → spinner. If `!isAuthenticated` → `AuthNavigator`. Else → `ExecutiveNavigator`.
- **`AuthNavigator`** (`src/navigation/AuthNavigator.tsx`): Native stack with 2 screens:
  - `Login` → `LoginScreen` (email + password form)
  - `OTP` → `OTPScreen` (6-digit code input, 30s resend timer)
- **`ExecutiveNavigator`** (`src/navigation/ExecutiveNavigator.tsx`):
  - Calls `useLocationPinger()` hook at top level (always active when authenticated).
  - Outer: `NativeStackNavigator` with 3 screens:
    - `ExecutiveTabs` — Bottom tab navigator
    - `Profile` — Profile screen (name, email, logout button)
    - `ActivityForm` — `Activity232FormScreen` (modal presentation), params: `{ leadId, leadName }`
  - Inner Bottom Tabs (`ExecutiveTabParamList`):
    - `Dashboard` → `DashboardScreen` (labeled "Tracking", icon: MapPin)
    - `Notes` → `MeetingNotesScreen` (icon: FileText)
    - `Leads` → `LeadsScreen` (icon: Briefcase)
    - `Tasks` → `TasksScreen` (icon: List)
  - Header: Left = Kalvium logo, Right = hamburger `Menu` icon opening a modal dropdown with "Profile" link.

### 3.4 Auth Store — `src/stores/authStore.ts`
**State**: `user: User | null`, `firebaseUser`, `isAuthenticated: boolean`, `isLoading: boolean`, `error: string | null`, `phoneConfirmation`.
**Actions**:
- `initialize()`: Subscribes to `onAuthStateChanged`. On sign-in, fetches `users/{uid}` from Firestore. If not found, tries SecureStore cache. Returns unsubscribe function.
- `loginWithEmail(email, password)`: Calls Firebase `signInWithEmailAndPassword`. Auth listener handles the rest.
- `loginWithPhone(phoneNumber)`: Calls `signInWithPhoneNumber`, stores confirmation result.
- `verifyOTP(code)`: Calls `confirmation.confirm(code)`.
- `logout()`: Calls `auth().signOut()`.

### 3.5 Auth Service — `src/services/auth.ts`
- `signInWithEmail(email, password)` → Firebase auth + caches profile to SecureStore.
- `signInWithPhone(phoneNumber)` → Returns `ConfirmationResult`.
- `confirmPhoneOTP(confirmation, code)` → Confirms OTP + caches profile.
- `signOut()` → Firebase sign out + deletes SecureStore cache.
- `getUserProfile(userId)` → Reads `users/{userId}` from Firestore, falls back to SecureStore.
- `getCachedUserProfile()` → Reads from `expo-secure-store` key `kalvium_user_profile`.

### 3.6 Screens

#### `DashboardScreen` (`src/screens/executive/DashboardScreen.tsx`)
- **Purpose**: Main tracking screen. Shows daily stats, date picker (last 15 days), visit list, upcoming tasks, geofence alerts, and a "Start Day" modal.
- **Hooks used**: `useOutreachTracking(user.id)`, `useCrmActivities(user.email)`, `usePendingAppointments(user.id)`.
- **Date filtering**: Filters `allActivities` by `walkInDateTime` or `lsqCreatedOn` within selected date's 00:00–23:59.
- **Start Day flow**: Animated button (crimson → emerald morph). Requests foreground location permission, gets high-accuracy GPS, then calls `startDay()` from `useOutreachTracking`.
- **Sub-components** (all in `src/components/dashboard/`):
  - `DashboardHeader` — Greeting with user name.
  - `DashboardDatePicker` — Horizontal scrollable date pills (last 15 days).
  - `DailyStatsCard` — Shows visit count for selected date.
  - `TrackingStatusIndicator` — Green dot if tracking, grey if not.
  - `GeofenceAlert` — Shows when near a known school. ⚠️ BUG: navigates to non-existent `CheckIn` route.
  - `UpcomingTasksList` — Pending appointments from `usePendingAppointments`.
  - `VisitsList` — List of activities for the selected date.
  - `StartDayModal` — Full-screen overlay shown when tracking hasn't started yet.
  - `ClassificationPromptModal` — Asks user to classify a detected stop (school/teashop/park/break).

#### `LeadsScreen` (`src/screens/executive/LeadsScreen.tsx`)
- **Purpose**: Shows leads assigned to the executive from LeadSquared.
- **Data source**: Fetches from `GET /api/leads?email=...` on the webhook server.
- ⚠️ BUG: `API_BASE` is hardcoded to `http://localhost:3001` (or `10.0.2.2:3001` on Android). Broken on real devices.
- **UI**: Search bar, FlatList of lead cards. Tapping a lead navigates to `ActivityForm` with `{ leadId: item.ProspectID, leadName }`.

#### `Activity232FormScreen` (`src/screens/executive/Activity232FormScreen.tsx`)
- **Purpose**: Detailed form to log a visit activity (Code 232 in LSQ).
- **Receives params**: `{ leadId, leadName }` from navigation.
- **Form fields** (mapped to LSQ `mx_Custom_*` fields):
  - Activity Type (`mx_Custom_2`): Initial Visit / Follow up / Seminar (pill selector)
  - Walk-in Type (`mx_Custom_36`): Scheduled / Unscheduled
  - Status (`mx_Custom_4`): Conducted / Refused / Rescheduled
  - Meeting Notes (`ActivityEvent_Note`): multiline text
  - PIC Name (`mx_Custom_13`), PIC Phone (`mx_Custom_15`)
  - Principal Name (`mx_Custom_21`), Principal Phone (`mx_Custom_23`)
  - Board (`mx_Custom_37`), Student Strength (`mx_Custom_35`), Fees (`mx_Custom_33`)
- **Submit flow**: Builds an array of `{ SchemaName, Value }` objects, filters out empty values, calls `startWalkIn(leadId, leadName, activityData)` from `useWalkInSync` hook.

#### `MeetingNotesScreen` (`src/screens/executive/MeetingNotesScreen.tsx`)
- **Purpose**: Record and manage voice notes. Push recordings to LeadSquared.
- **Hooks**: `useMeetingRecordings(user.id)`, `usePushToLs(user.id)`, `useMeetingAudioRecorder(user.id)`, `useCrmActivities(user.email)`.
- **Recording flow**: Tap mic button → requests permissions → `expo-audio` starts recording → tap stop → uploads to Cloudinary → saves metadata to `meetingRecordings` collection.
- **Push to LS flow**: Each recording card has a "Push to LS" button. Opens `PushToLsModal` showing recent PIC/Principal activities. User picks one → creates `pushQueue` document.
- **UI**: SectionList grouped by date (Today/Yesterday/dates), floating mic button at bottom.

#### `TasksScreen` (`src/screens/executive/TasksScreen.tsx`)
- **Purpose**: View pending and completed tasks.
- **Hook**: `useTasks(user.id, activeTab)` — listens to `appointments` collection.
- **UI**: Two tabs (Pending/Completed), list of task cards with complete action.

### 3.7 Custom Hooks (`src/hooks/`)

| Hook | File | Purpose | Firestore Collection |
|---|---|---|---|
| `useCrmActivities(email)` | `useCrmActivities.ts` | Real-time listener for CRM activities by executive email | `crmActivities` |
| `useLocationPinger()` | `useLocationPinger.ts` | Listens for `locationRequests` where status='pending', fetches GPS, writes to `dailyTracks`, marks request as fulfilled | `locationRequests`, `dailyTracks` |
| `useMeetingAudioRecorder(userId)` | `useMeetingAudioRecorder.ts` | Records audio via `expo-audio`, uploads to Cloudinary, saves to `meetingRecordings` | `meetingRecordings` |
| `useMeetingRecordings(userId)` | `useMeetingRecordings.ts` | Real-time listener for recordings, groups by date for SectionList | `meetingRecordings` |
| `usePendingAppointments(userId)` | `usePendingAppointments.ts` | Real-time listener for pending appointments | `appointments` |
| `usePushToLs(userId)` | `usePushToLs.ts` | Creates `pushQueue` doc to push recording URL to LSQ. ⚠️ Missing `action` field | `pushQueue`, `meetingRecordings` |
| `useTasks(userId, status)` | `useTasks.ts` | Real-time listener for tasks (pending/completed), sorted by date | `appointments` |
| `useWalkInSync(userId, email)` | `useWalkInSync.ts` | Creates local `crmActivities` doc + `pushQueue` doc for CREATE/UPDATE_ACTIVITY | `crmActivities`, `pushQueue` |

### 3.8 Tracking System (`src/tracking/`)

This is the most complex subsystem. It uses a chain of singletons:

#### `motionDetector.ts` — Singleton: `motionDetector`
- Uses `expo-sensors` Accelerometer at 1-second intervals.
- Three states: `STATIONARY` (magnitude ≤ 1.1g), `POSSIBLY_STOPPED` (60s debounce), `MOVING` (magnitude ≥ 1.3g).
- Publishes state changes to subscribers.

#### `locationTracker.ts` — Singleton: `locationTracker`
- Manages background location via `expo-location` + `expo-task-manager`.
- On start: requests FG + BG permissions, gets initial high-accuracy fix, starts motion detector.
- Adapts location accuracy based on motion state:
  - `MOVING`: High accuracy, 10m distance, 10s interval
  - `POSSIBLY_STOPPED`: High accuracy, 20m, 30s
  - `STATIONARY`: Lowest accuracy, 1km, 5 min (heartbeat mode)
- Buffers `LocationPoint` objects (`{ lat, lng, ts, speed, accuracy }`), flushes to subscribers every 60 seconds.
- Background task (`BACKGROUND_LOCATION_TASK`): Defined via `TaskManager.defineTask`. When OS delivers location in background, reads `tracking_session` from AsyncStorage and writes directly to Firestore via `firestoreSync.appendHeadlessLocations`.

#### `visitTracker.ts` — Singleton: `visitTracker`
- Subscribes to both `locationTracker` (for GPS points) and `motionDetector` (for state changes).
- When `STATIONARY` detected: records stop start time + location. Runs geofence check against loaded schools (200m radius using haversine).
- When `MOVING` detected after a stop: calls `evaluateStop()`:
  - If near a known school → auto-tag as `school` visit.
  - If stop < 90 seconds → auto-tag as `break`.
  - If long unclassified stop → prompts user via callback (shows `ClassificationPromptModal`).
- Emits `VisitEvent` objects to subscribers: `{ type, schoolId?, schoolName?, location, arrivedAt, departedAt, durationMinutes, manuallyTagged, notes? }`.

#### `firestoreSync.ts` — Singleton: `firestoreSync`
- Manages a tracking session: `startSession(userId)` creates/updates `dailyTracks/{userId}_{yyyyMMdd}` with `status: 'active'`.
- Subscribes to `locationTracker` → writes location batches to `dailyTracks/{id}/locations/{timestamp}` subcollection.
- Subscribes to `visitTracker` → writes visit events to `dailyTracks/{id}/visits/{uuid}` subcollection.
- `endSession()` → sets `status: 'ended'`, unsubscribes, clears AsyncStorage.
- `appendHeadlessLocations()` → batch writes for background task (no subscription needed).

#### `useOutreachTracking.ts` — Hook
- Orchestrates the tracking system for the UI.
- On mount: loads schools from Firestore, sets up callbacks on `visitTracker`, listens to `dailyTracks/{userId}_{today}` for remote start/stop.
- Remote control: If a TL changes `dailyTrack.status` to `'ended'` from the website, the app detects it via `onSnapshot` and stops tracking with an alert.
- `startDay()`: Sets `isTracking=true`, starts `firestoreSync`, `visitTracker`, `locationTracker`.
- `endDay()`: Stops everything, calls `firestoreSync.endSession()`.
- Auto-stop at 6 PM: Currently **DISABLED** (commented out for testing).

### 3.9 Services

#### `firebase.ts`
- Imports `@react-native-firebase/firestore`, `auth`, `storage`.
- Sets `cacheSizeBytes: CACHE_SIZE_UNLIMITED` for offline-first.

#### `firestore.ts`
- `getAllSchools()` → reads `schools` collection, caches for 1 hour.
- `appendPing(executiveId, date, ping)` → `arrayUnion` to `dailyTracks/{id}.pings`. (Legacy — subcollection approach is now primary.)
- `onDailyTrack(executiveId, date, callback)` → real-time listener on `dailyTracks/{executiveId}_{date}`.
- `haversineDistance(lat1, lng1, lat2, lng2)` → distance in meters. Used by `visitTracker` for geofencing.

#### `storage.ts`
- Uploads to **Cloudinary** (NOT Firebase Storage).
- Cloud name: `sot0ayge`, upload preset: `kalvium_image_and_audio_for_school`.
- Uses `XMLHttpRequest` for progress tracking.
- Audio files go to Cloudinary's `video` endpoint (Cloudinary treats audio as video).
- `uploadRecording(localUri, meetingId)` → returns Cloudinary `secure_url`.

#### `recording.ts`
- `cleanupOldRecordings()` → scans `recordings/` directory in app documents, deletes `.m4a` files older than 7 days based on filename timestamp pattern `recording_{timestamp}.m4a`.

#### `headlessTask.ts`
- Registers `background-location-fetch` task via `expo-background-fetch` (15-min minimum interval).
- On wake: reads `tracking_session` from AsyncStorage, gets balanced-accuracy location, appends ping to Firestore.
- Also checks `locationRequests` collection for pending on-demand requests from TLs, fulfills with high-accuracy location.

### 3.10 Types — `src/types/index.ts`
```typescript
type UserRole = 'executive' | 'teamLead' | 'regionalManager' | 'admin';
type StopClassification = 'school' | 'teashop' | 'park' | 'break' | 'unclassified';

interface User { id, name, email, phone, role: UserRole, employeeId?, regionId, managerId?, active }
interface School { id, name, type, address, district, city, state, lat, lng, principalName, principalPhone, alternateContact, grade12Count, totalStrength, streamsOffered[] }
interface LocationPing { lat, lng, accuracy, timestamp }
interface DetectedStop { lat, lng, arrivedAt, departedAt, classification: StopClassification, matchedSchoolId?, matchedSchoolName? }
interface DailyTrack { id, executiveId, date: string (yyyyMMdd), status?: 'active'|'ended', pings: LocationPing[], stops: DetectedStop[] }

// Navigation param lists
type AuthStackParamList = { Login: undefined; OTP: { phoneNumber, confirmation } }
type ExecutiveTabParamList = { Dashboard, Tasks, Notes, Profile, Leads }
type ExecutiveStackParamList = { ExecutiveTabs, Profile, ActivityForm: { leadId, leadName } }
```

---

## 4. Web Dashboard (`website/`) — Full Detail

### 4.1 Tech Stack
| Concern | Library |
|---|---|
| Framework | React 19 + Vite 8 |
| UI | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Icons | `lucide-react` |
| Charts | `recharts` |
| Maps | `leaflet` + `react-leaflet` |
| State | Zustand v5 |
| Routing | `react-router-dom` v7 |
| Font | `@fontsource-variable/geist` |
| Date | `date-fns`, `react-day-picker` |
| Firebase | `firebase` web SDK v12 |
| Toasts | `@radix-ui/react-toast` |

### 4.2 Firebase Config — `src/firebase.ts`
- Project: `kalvium-outreach-53f54`
- Initializes **two** Firebase apps:
  - `app` (primary): For auth and Firestore reads.
  - `secondaryApp` ("SecondaryApp"): Used ONLY when creating new associate accounts, so the admin doesn't get logged out. ⚠️ BUG: Not guarded against duplicate init on hot-reload.
- Exports: `app`, `auth`, `db`, `secondaryApp`, `secondaryAuth`.

### 4.3 App Layout — `src/App.tsx`
- **Sidebar**: Fixed left bar (80px wide, rounded pill shape) with nav icons: Team Overview (`/`), School Pipeline (`/pipeline`), Analytics (`/analytics`), Logout, User avatar.
- **Routes**: `/login` (public), `/` + `/pipeline` + `/analytics` (protected via `ProtectedRoute` wrapper).
- **Auth**: Uses `useAuthStore().initialize()` on mount.

### 4.4 Auth Store — `src/stores/authStore.ts`
- `initialize()`: Sets up `onAuthStateChanged` listener. Also subscribes to ALL `users` collection docs (for team management).
- `login(email, pass)`: Firebase `signInWithEmailAndPassword`.
- `logout()`: Firebase `signOut`.
- `addAssociate(newUser, password)`: Creates user via `secondaryAuth` (so primary user stays logged in), writes `users/{uid}` doc, then signs out secondary auth.
- **State**: `users: Record<string, User>` (all users), `user: User | null` (current user).

### 4.5 Pages

#### Dashboard (`src/pages/Dashboard.tsx`) — The largest and most complex page
**Purpose**: Team management view with live map, timeline, and remote tracking control.

**State variables**: ~15 useState hooks for associate selection, date, map, modals, tracking status.

**Data subscriptions** (all real-time via Firestore `onSnapshot`):
1. Global visit count today → `visits` collection filtered by timestamp.
2. Toast notifications for new visits.
3. Selected associate's data (when one is picked from sidebar):
   - `dailyTracks/{associateId}_{dateStr}` → tracking status (active/ended).
   - `dailyTracks/{id}/locations` subcollection (ordered by `ts`) → map route polyline.
   - `visits` collection filtered by executiveId + date → visit events.
   - `dailyTracks/{id}/visits` subcollection → auto-detected stops.
   - `locationRequests` filtered by executiveId → on-demand location request status.
   - `crmActivities` filtered by executiveEmail → CRM activities for timeline.

**Timeline merge logic**: Combines visits, auto-stops, location requests, and CRM activities into a single chronological timeline array. Each item has `{ time, event, type, lat, lng, timestamp, status, data }`.

**Key actions**:
- `handleFetchLocation()` → writes a `locationRequests` doc with `status: 'pending'`. The mobile app's `useLocationPinger` hook picks this up.
- `toggleTrackingStatus()` → flips `dailyTracks` status between `active` and `ended`. ⚠️ BUG: writes date as `yyyy-MM-dd` but mobile app expects `yyyyMMdd`.
- `handleSyncLSQ()` → calls `GET /api/sync-now` on the webhook server.
- `handleAddAssociate()` → calls `addAssociate()` from auth store.

**Sub-components**:
- `TeamSidebar` — Left panel: search, list of executives (filtered by role), "Add Associate" dialog, "Sync LSQ" button.
- `GlobalStats` — Shows total associates, total visits today, total leads (when no associate selected).
- `AssociateHeader` — Selected associate's name, region, date picker (calendar popover), tracking toggle (live/stopped switch), visit count, "Assign Task" button.
- `AssociateMap` — Leaflet map showing route polyline, markers for timeline events, "Fetch Location" button.
- `AssociateTimeline` — Scrollable timeline of events for selected date. Expandable cards. Click to zoom map.
- `AssignTaskModal` — Dialog to create a task (title, notes, date, type) → writes to `appointments` collection.
- `TimelineActivityDialog` — Full detail dialog for a CRM activity (school name, status, contacts, proposals, etc.).

#### Pipeline (`src/pages/Pipeline.tsx`)
**Purpose**: Kanban-style board showing schools moving through CRM stages.

**Stages** (defined in `pipeline/types.ts`):
- Index -1: Unclassified
- Index 0: Refused Entry (RE) — red
- Index 1: Front Desk Interaction (FDI) — amber
- Index 2: PIC Interaction (PCI) — blue
- Index 3: Principal Interaction (PI) — emerald

**`getStageIndex(walkInStatus)`**: Searches for stage short code (RE, FDI, PCI, PI) in the `walkInStatus` string.

**Pipeline aggregation**: Groups all `crmActivities` by `schoolName`, keeps the latest/highest stage per school, counts visits, tracks seminar and follow-up dates.

**Filters**: Search by school/executive name, date filter, associate filter, task type (seminar/follow-up).

**Sub-components**:
- `PipelineBoard` — Horizontal columns for each stage, school cards with drag-to-reveal details.
- `PipelineSeminars` — Separate section showing upcoming seminars and follow-ups.
- `SchoolDetailSheet` — Slide-over panel showing all activities for a selected school.
- `PipelineFilterPopover` — Filter controls dropdown.

#### Analytics (`src/pages/Analytics.tsx`)
- Fetches last 7 days of `visits` collection.
- Passes to `AnalyticsTab` component which renders Recharts charts.

#### Login (`src/pages/Login.tsx`)
- Simple email + password form using shadcn components.

---

## 5. Webhook Server (`webhook-server/`) — Full Detail

### 5.1 Tech Stack
- Node.js + Express
- Firebase Admin SDK (`firebase-admin`)
- Firebase Functions v2 (`onRequest`, `onSchedule`, `onDocumentCreated`)
- `node-fetch` for LSQ API calls
- Environment: `config.env` for local dev, Firebase secrets for production

### 5.2 Configuration
- `LSQ_HOST`: `https://api-in21.leadsquared.com`
- `ACCESS_KEY` / `SECRET_KEY`: From env vars or Firebase secrets
- `OUTREACH_ACTIVITY_CODE`: 232
- `SYNC_INTERVAL_MINUTES`: 5
- `SYNC_LOOKBACK_MINUTES`: 30

### 5.3 Firebase Admin Init
- Tries `FIREBASE_SERVICE_ACCOUNT` env var (JSON string) first.
- Falls back to `../serviceAccountKey.json` file.
- Falls back to Application Default Credentials (for Cloud Functions).

### 5.4 Exported Cloud Functions

#### `api` (`onRequest`) — Express HTTP endpoints
- `GET /api/health` → server status + last sync result.
- `GET /api/sync-now` → triggers 24-hour backfill sync (put-and-forget, responds immediately).
- `GET /api/last-sync` → returns `lastSyncResult` object.
- `GET /api/leads?email=...` → Proxies to LSQ AdvancedSearch API, returns leads assigned to that email. Returns `{ success, leads }`.
- `POST /api/push-recording` → Adds to `pushQueue` collection (legacy endpoint, mostly replaced by direct Firestore writes from app).

#### `syncCron` (`onSchedule`, every 5 minutes)
- Only runs during IST working hours (08:45 to 18:15).
- Calls `syncActivities()` which:
  1. Calculates date range (last 30 minutes).
  2. Calls LSQ bulk API: `POST /v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent` with `ActivityEvent: 232`.
  3. Paginates results (100 per page).
  4. For each activity, fetches full individual record via `POST /v2/ProspectActivity.svc/Retrieve?leadId=...` to get `Latitude`, `Longitude`, `Address` (stripped from bulk API).
  5. Builds email→Firestore user ID mapping from `users` collection.
  6. Fetches lead names via `GET /v2/LeadManagement.svc/Leads.GetById?id=...`.
  7. Parses activity data from multiple possible formats (`mx_Custom_*` fields, `ActivityData` array, `Data` array, `Fields` object).
  8. Builds Firestore document via `buildFirestoreDoc()` (see schema below).
  9. Batch writes to `crmActivities/{activityId}` (500 per batch, using `set` with `merge: true`).

#### `processPushQueue` (`onDocumentCreated` on `pushQueue/{docId}`)
- Triggered automatically when mobile app creates a queue item.
- Reads `action` field (or falls back to checking `storageUrl` for legacy `PUSH_RECORDING`).
- **`CREATE_ACTIVITY`**: Calls LSQ `POST /v2/ProspectActivity.svc/CustomActivity/Create` with `ActivityEvent: 232`, `Fields: activityData`. Updates local `crmActivities` doc with new `lsqActivityId`.
- **`UPDATE_ACTIVITY`**: Calls LSQ `POST /v2/ProspectActivity.svc/CustomActivity/Update` with `ProspectActivityId`.
- **`PUSH_RECORDING`**: Fetches existing notes from `crmActivities`, appends recording URL, updates LSQ, updates local doc, marks `meetingRecordings` as `pushedToLS: true`.
- On success: marks queue item `status: 'completed'`.
- On failure: marks `status: 'failed'` with error message.

### 5.5 LSQ Field Mapping (mx_Custom_* → Firestore)
```
mx_Custom_1  → walkInDateTime
mx_Custom_2  → activityType (Initial Visit, Follow up, Seminar)
mx_Custom_3  → livePhotoUrl
mx_Custom_4  → walkInStatus (Conducted, Refused, Rescheduled)
mx_Custom_5  → refusedEntryReason (alt: mx_Custom_10)
mx_Custom_6  → followUpDate
mx_Custom_7  → statusFrontDesk
mx_Custom_8  → statusPIC
mx_Custom_9  → statusPrincipal
mx_Custom_12 → proposalSentToSchool
mx_Custom_13 → picName
mx_Custom_15 → picPhone
mx_Custom_16 → picDesignation
mx_Custom_17 → picAppointmentDate
mx_Custom_18 → seminarAppointmentDate
mx_Custom_19 → leadsGenerated
mx_Custom_21 → principalName
mx_Custom_23 → principalPhone
mx_Custom_25 → proposalSentToPIC
mx_Custom_26 → proposalSentToPrincipal
mx_Custom_27 → principalAppointmentDate
mx_Custom_28 → batch2025Leads
mx_Custom_29 → batch2026Leads
mx_Custom_30 → batch2027Leads
mx_Custom_31 → batch2028Leads
mx_Custom_32 → seminarConductedDate
mx_Custom_33 → schoolFees
mx_Custom_34 → GPS location (lat,lng string or JSON)
mx_Custom_35 → studentStrength
mx_Custom_36 → typeOfWalkIn (Scheduled, Unscheduled)
mx_Custom_37 → boardOfSchool
```

---

## 6. Firestore Database Schema

### `users/{userId}`
```
id: string
name: string
email: string
phone: string
role: 'executive' | 'teamLead' | 'regionalManager' | 'admin'
employeeId?: string
regionId: string
managerId?: string          // Links executive to their TL
active: boolean
```

### `schools/{schoolId}`
```
id, name, type, address, district, city, state: string
lat, lng: number
principalName, principalPhone, alternateContact: string
grade12Count, totalStrength: number
streamsOffered: string[]
```

### `dailyTracks/{executiveId}_{yyyyMMdd}`
```
userId: string
date: string (yyyyMMdd format)
startTime: number (epoch ms)
endTime?: number (epoch ms)
status: 'active' | 'ended'
lastPing: Timestamp (server)
pings?: LocationPing[]      // Legacy array (appendPing uses arrayUnion)
```
**Subcollections**:
- `locations/{timestamp}` → `{ lat, lng, ts, speed, accuracy }` — Written by firestoreSync / headless task.
- `visits/{uuid}` → VisitEvent objects from visitTracker.

### `crmActivities/{activityId}`
The central collection. `activityId` = LSQ `ProspectActivityId` (for synced records) or a random UUID (for app-created records).
```
lsqActivityId: string       // LSQ ProspectActivityId
lsqLeadId: string           // LSQ RelatedProspectId
executiveId: string          // Firestore userId
executiveEmail: string       // lowercase email

schoolName: string
activityType: string         // 'Initial Visit', 'Follow up', 'Seminar'
typeOfWalkIn: string         // 'Scheduled', 'Unscheduled'
walkInStatus: string         // 'Conducted', 'Refused Entry - RE', 'Front Desk Interaction - FDI', etc.
walkInDateTime: string       // ISO UTC string with Z suffix
notes: string

statusFrontDesk: string
statusPIC: string
statusPrincipal: string
refusedEntryReason: string

picName, picPhone, picDesignation: string
principalName, principalPhone: string

lat: number | null
lng: number | null
livePhotoUrl: string

proposalSentToSchool, proposalSentToPIC, proposalSentToPrincipal: string
followUpDate, picAppointmentDate, principalAppointmentDate: string (ISO UTC)
seminarAppointmentDate, seminarConductedDate: string (ISO UTC)

boardOfSchool, studentStrength, schoolFees: string
leadsGenerated, batch2025Leads, batch2026Leads, batch2027Leads, batch2028Leads: string

source: 'leadsquared' | 'app-push'
lsqCreatedOn: string (ISO UTC)
lsqModifiedOn: string (ISO UTC)
syncedAt: Timestamp (server)
```

### `pushQueue/{autoId}`
Ephemeral queue for async operations. Processed by `processPushQueue` Cloud Function.
```
action: 'CREATE_ACTIVITY' | 'UPDATE_ACTIVITY' | 'PUSH_RECORDING'
activityId?: string
leadId?: string
executiveId: string
notes?: string
activityData?: Array<{ SchemaName: string, Value: string }>
storageUrl?: string          // For PUSH_RECORDING
recordingId?: string         // For PUSH_RECORDING
schoolName?: string
status: 'pending' | 'completed' | 'failed'
error?: string
createdAt: Timestamp (server)
completedAt?: Timestamp
failedAt?: Timestamp
```

### `meetingRecordings/{autoId}`
```
executiveId: string
timestamp: Timestamp (server)
storageUrl: string           // Cloudinary URL
duration: number             // milliseconds
pushedToLS?: boolean
mappedActivityId?: string
mappedSchoolName?: string
```

### `appointments/{autoId}`
```
executiveId: string
title: string
notes?: string
date: string (ISO date)
type?: string                // 'seminar', 'follow_up', etc.
status: 'pending' | 'completed'
completedAt?: Timestamp
createdBy?: string           // TL userId
createdAt?: Timestamp
```

### `locationRequests/{autoId}`
Used for on-demand location fetch from TL dashboard.
```
executiveId: string
requestedAt: Timestamp (server)
status: 'pending' | 'processing' | 'fulfilled' | 'error'
```

### `visits/{autoId}` (Legacy)
Older visit tracking format, still queried by Dashboard for global stats and Analytics page.
```
executiveId: string
schoolName?: string
type: 'school' | 'break' | 'unclassified' | 'location_ping'
timestamp: number (epoch ms)
checkInLat?, checkInLng?: number
status?: string
```

---

## 7. External Services

### LeadSquared CRM API
- **Host**: `https://api-in21.leadsquared.com`
- **Auth**: `accessKey` + `secretKey` query params on every request.
- **Key endpoints used**:
  - `POST /v2/ProspectActivity.svc/CustomActivity/RetrieveByActivityEvent` — Bulk fetch activities by event code.
  - `POST /v2/ProspectActivity.svc/Retrieve?leadId=...` — Fetch activities for a specific lead (includes Lat/Lng).
  - `POST /v2/ProspectActivity.svc/CustomActivity/Create` — Create a new activity.
  - `POST /v2/ProspectActivity.svc/CustomActivity/Update` — Update an existing activity.
  - `GET /v2/LeadManagement.svc/Leads.GetById?id=...` — Get lead details (school name).
  - `POST /v2/LeadManagement.svc/Leads.AdvancedSearch` — Search leads by owner email.

### Cloudinary
- **Cloud name**: `sot0ayge`
- **Upload preset**: `kalvium_image_and_audio_for_school` (unsigned upload)
- **Usage**: Audio recordings uploaded as `video` resource type.

### Firebase Project
- **Project ID**: `kalvium-outreach-53f54`
- **Auth Domain**: `kalvium-outreach-53f54.firebaseapp.com`
- **Functions URL**: `https://us-central1-kalvium-outreach-53f54.cloudfunctions.net/api`

---

## 8. Data Flow Diagrams

### Flow 1: Executive starts tracking
```
App: User taps "Start Day"
  → useOutreachTracking.startDay()
    → firestoreSync.startSession(userId)
      → Creates/updates dailyTracks/{userId}_{yyyyMMdd} with status: 'active'
      → Saves {userId, dateStr} to AsyncStorage
    → visitTracker.start()
      → Subscribes to locationTracker + motionDetector
    → locationTracker.startTracking()
      → Requests permissions
      → Gets initial high-accuracy GPS fix
      → Starts Accelerometer (motionDetector)
      → Starts expo-location background task
      → Starts 60s buffer flush timer
```

### Flow 2: Executive submits activity form
```
App: User fills Activity232FormScreen → taps "Push to LeadSquared"
  → useWalkInSync.startWalkIn(leadId, leadName, activityData)
    → 1. Creates crmActivities/{uuid} in Firestore (source: 'app-push')
    → 2. Creates pushQueue/{autoId} with action: 'CREATE_ACTIVITY'

Server: processPushQueue triggers on new pushQueue doc
  → Calls LSQ API: POST .../CustomActivity/Create
  → Updates crmActivities/{uuid} with lsqActivityId from LSQ response
  → Marks pushQueue doc as 'completed'
```

### Flow 3: TL remotely fetches executive location
```
Website: TL clicks "Fetch Location" button
  → Creates locationRequests/{autoId} with status: 'pending'

App (foreground): useLocationPinger detects new pending request via onSnapshot
  → Updates status to 'processing'
  → Gets high-accuracy GPS
  → Appends ping to dailyTracks via appendPing()
  → Updates status to 'fulfilled'

App (background): headlessTask wakes up (15-min interval)
  → Checks locationRequests for pending requests
  → Same flow as above
```

### Flow 4: Downstream sync (LSQ → Firestore)
```
Server: syncCron fires every 5 minutes (IST 08:45–18:15 only)
  → Fetches last 30 min of Activity 232 from LSQ bulk API
  → For each activity: fetches full record (for Lat/Lng)
  → Fetches lead names from LSQ
  → Maps mx_Custom_* fields to readable Firestore field names
  → Batch writes to crmActivities/{activityId}

App + Website: Both have onSnapshot listeners on crmActivities
  → UI updates automatically in real-time
```

---

## 9. Known Bugs

| # | Severity | File | Description |
|---|---|---|---|
| 1 | 🔴 Critical | `app/src/screens/executive/LeadsScreen.tsx:12` | `API_BASE` hardcoded to `localhost:3001`. Broken on real devices. |
| 2 | 🔴 Critical | `website/src/pages/Dashboard.tsx:315` | `toggleTrackingStatus` writes date as `yyyy-MM-dd` but mobile expects `yyyyMMdd`. Remote start/stop broken. |
| 3 | 🔴 Critical | `app/src/hooks/usePushToLs.ts:13-21` | Missing `action: 'PUSH_RECORDING'` in pushQueue doc. Relies on fragile fallback. |
| 4 | 🔴 Critical | `website/src/firebase.ts:20` | `secondaryApp` not guarded against duplicate init. Crashes on Vite hot-reload. |
| 5 | 🟡 Medium | `app/src/screens/executive/DashboardScreen.tsx:150` | Navigates to non-existent `CheckIn` route. |
| 6 | 🟡 Medium | `website/src/pages/Dashboard.tsx:51-52` | `todayStart`/`todayEnd` not memoized, causes infinite re-subscribes. |
| 7 | 🟡 Medium | `website/src/pages/Dashboard.tsx:196` | `var unsubCrm` instead of `let`. |
| 8 | 🟡 Medium | `app/src/screens/executive/DashboardScreen.tsx:33-43` | Timezone mismatch: local time filter vs UTC activity timestamps. |
| 9 | 🟢 Low | `app/App.tsx:37` | Unnecessary `as any` cast on `initialize`. |
| 10 | 🟢 Low | `app/src/tracking/useOutreachTracking.ts:87-91` | Auto-stop at 6 PM disabled for testing. |

---

## 10. Design Conventions

### Mobile App
- **Colors**: Primary `#E11D48` (crimson), Background `#FAF8F5` / `#F8FAFC`, Text `#1C1917` / `#0F172A`.
- **Borders**: `#E7E5E4`, `#F1F5F9`.
- **Components**: Gluestack UI primitives with NativeWind className strings.
- **Icon set**: `lucide-react-native` (MapPin, FileText, Briefcase, List, User, Menu, etc.), stroke width 1.5–2.
- **Patterns**: Cards with `rounded-2xl`, soft shadows, pill-shaped selection buttons, animated state transitions.

### Website
- **Theme**: Dark sidebar (zinc-900), light content area (fafafa / white).
- **Rounded corners**: `rounded-xl` everywhere.
- **Shadows**: `shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]` (very subtle).
- **Typography**: Geist font, tracking-tight headings, uppercase 11px labels.
- **Components**: shadcn/ui (Dialog, Popover, Calendar, ScrollArea, Button, Input, Toast).
- **Animations**: `animate-in fade-in duration-700`, `slide-in-from-top-4`.
