# Kalvium Outreach App — Complete Project Context (Deep Dive)

This document serves as the absolute source of truth for the Kalvium Outreach monorepo. It contains all architectural decisions, business logic, component behaviors, backend API flows, rate-limit topologies, GPS algorithms, and security implementations.

---

## 1. Project Overview & Business Logic
Kalvium Outreach is a monorepo consisting of a mobile app (for sales executives in the field), a web dashboard (for managers/admins to track performance and manage leads), and a backend server (acting as a webhook receiver and proxy to LeadSquared CRM). 

**Core Workflow**:
1. **Field Executives** use the mobile app to visit schools, log "Walk-In" activities, record audio notes, and create new leads.
2. **The Mobile App** tracks their GPS location aggressively, filtering out bad GPS data using a strict 5-gate algorithm, and pushes this data to Firestore.
3. **Managers** use the Web Dashboard to view CRM pipelines, track associate travel distances, manage tasks, and view analytics.
4. **The Backend Server** manages bi-directional sync with LeadSquared (LSQ) CRM and provides rate-limited, authenticated API endpoints for the apps.

---

## 2. Monorepo Structure

```
kalvium-outreach/
├── app/                          # React Native (Expo) mobile app
│   ├── App.tsx                   # Root component
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── navigation/
│   │   ├── screens/
│   │   │   ├── auth/             # LoginScreen, OTPScreen
│   │   │   └── executive/        # AddLeadScreen, BugReportScreen, DashboardScreen,
│   │   │                         # LeadDetailScreen, LeadsScreen, MeetingNotesScreen,
│   │   │                         # TasksScreen, WalkInSessionScreen
│   │   ├── services/
│   │   ├── stores/
│   │   ├── tracking/             # locationTracker, motionDetector, firestoreSync
│   │   └── types/
│
├── website/                      # React (Vite) web dashboard
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── admin/            # UserManagement.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── BugReport.tsx
│   │   │   ├── CRMHub.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DevLogs.tsx
│   │   │   ├── DistanceTracker.tsx
│   │   │   ├── LeadRequests.tsx
│   │   │   ├── Login.tsx
│   │   │   └── TaskCenter.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── stores/
│
├── webhook-server/               # Firebase Functions v2 backend
│   ├── src/
│   │   ├── api/                  # routes.js, authMiddleware.js
│   │   ├── config/               # Firebase Admin, constants
│   │   └── services/             # sync.js, lsq.js, pushQueue.js
│   ├── server.js                 # Function exports
│   └── package.json
│
├── firebase.json                 # Root Firebase config
└── firestore.rules               # Security rules
```

---

## 3. Mobile App (React Native + Expo)
The mobile app is designed for offline-first, battery-efficient tracking of field executives.

### 3.1 Architecture & State
- **Frameworks**: Expo 56, React Native 0.85, React 19.
- **State Management**: `zustand` (`authStore`, `walkInStore`).
- **UI**: Gluestack UI (`@gluestack-ui/themed`), Lucide Icons.
- **Navigation**: React Navigation. Root -> Auth / ExecutiveTabs.
  - `ExecutiveTabs`: Dashboard, Notes, Tasks, Leads.
  - Modals/Stacks: `WalkInSessionScreen`, `AddLeadScreen`, `LeadDetailScreen`.

### 3.2 Key Screens & Features
- **`WalkInSessionScreen`**: A highly robust 4-phase flow for logging School Visits (LSQ Activity 232).
  1. **Pre-Walk-In**: Fetches GPS to validate proximity to the school.
  2. **Active**: User can select to "Record Meeting" or skip to form.
  3. **Recording**: Uses `useWalkInAudioRecorder` to capture mic data.
  4. **Form**: User submits visit details. Requires a GPS distance check (`<= 300m`). Uploads a watermarked photo to Cloudinary. Maps data to LSQ via `buildWalkInActivityData`.
- **`AddLeadScreen`**: Allows executives to rapidly create a lead. Collects School Name, Phone, Address, Board. Fetches GPS and calls `POST /api/leads`. Includes UI validation to prevent accidental submissions.
- **`DashboardScreen`**: Overview of today's visits, active shift status, and immediate task alerts. Includes logic to render "CheckIn" routes (though some routing may need patching).
- **`MeetingNotesScreen`**: Allows recording raw voice notes which are uploaded and pushed to LSQ.

### 3.3 Advanced Tracking System (`src/tracking/`)
The app uses background GPS tracking to monitor associate travel, highly optimized to save battery.
- **`motionDetector.ts`**: Uses the device accelerometer to detect if the user is `MOVING` or `STATIONARY`.
- **`locationTracker.ts`**: Handles GPS ping collection. Implements a **Deep Stationary Mode**: if stationary for >5 mins, GPS accuracy drops to `Low` (WiFi/Cell only) to prevent battery drain. When motion resumes, it instantly grabs a `High` accuracy fix.
- **5-Gate GPS Quality Filter** (`filterLocationPoints`):
  - *Gate 0 (Validity)*: Rejects NaN, null-island (0,0), and out of bounds coordinates.
  - *Gate 1 (Accuracy)*: Rejects pings with accuracy >300m.
  - *Gate 2 (Speed)*: Rejects pings implying >55 m/s (GPS glitch).
  - *Gate 3 (Distance)*: Rejects pings <3m from previous (stationary drift).
  - *Gate 4 (Bearing)*: Rejects zigzag bearing jumps at slow speeds (walking/driving jitter).
  - *Gate 5 (Altitude)*: Rejects >10km altitude jumps (prevents extreme Z-axis errors).
- **`firestoreSync.ts`**: Batches clean GPS points and writes them to the `dailyTracks` collection in Firestore.

---

## 4. Web Dashboard (React + Vite)
Used by Managers and Admins to monitor sales, pipelines, and track field teams.

### 4.1 Architecture & Tools
- **Frameworks**: React 19, Vite 8, Tailwind CSS 3.
- **Components**: shadcn/ui components (Radix UI primitives).
- **Charts/Maps**: Recharts, Leaflet.
- **State Management**: `zustand` (`authStore.ts`).

### 4.2 Key Pages
- **`CRMHub.tsx` (Pipeline & Leads)**: The core CRM view. Features a toggle between 3 modes:
  1. `Board`: A Kanban pipeline board grouping schools by CRM stage (e.g. Refused Entry, PIC Interaction).
  2. `List`: A sortable, paginated table of leads (`CrmTableView`).
  3. `Tasks`: Embedded task management.
  - Uses `GlobalDataFilter` to filter by Date, Associate, and Task Type.
- **`DistanceTracker.tsx`**: Advanced analytics for executive travel. 
  - Fetches `dailyTracks` from Firestore.
  - Calculates true Haversine distance from the raw GPS `routeArray`.
  - Caches data heavily (`distanceCache`).
  - Supports ranges (Month, Week, Today) and CSV Export. Displays Total Km, Daily Avg, and Best Day per associate.
- **`admin/UserManagement.tsx`**: Admin portal to create and manage users. 
  - Uses Role-Based assignment (Executive, Team Lead, Senior Manager, AGM, Admin).
  - Defines reporting structures (`managerId`, `seniorManagerId`).
  - Renders a visual `OrgChart`.
- **`Analytics.tsx`**: Renders high-level Recharts dashboards for visits/seminars.
- **`TaskCenter.tsx`**: Full-page calendar and list view for associate tasks.

---

## 5. Backend Server (Express + Firebase Functions)
The NodeJS backend handles LSQ syncing and provides secure, rate-limited APIs for the apps to use.

### 5.1 Tech Stack
- Node.js + Express
- Firebase Admin SDK (`firebase-admin`)
- Firebase Functions v2 (`onRequest`, `onSchedule`, `onDocumentCreated`)
- `node-fetch` for LSQ API calls

### 5.2 Authentication & Security (`authMiddleware.js`)
- All `/api/*` routes are secured.
- Clients must pass a Firebase ID Token in `Authorization: Bearer <token>`.
- **RBAC (Role-Based Access Control)**: User roles are embedded directly in the token as Firebase Custom Claims, preventing database lookups on every request.

### 5.3 Rate Limiting (DDoS Protection)
To protect LSQ quotas and Firebase billing from scrapers:
- **Global Limiter**: Max 100 requests / 15 minutes per IP.
- **Search Limiter**: Max 20 requests / 15 minutes per IP for `/api/leads/search` (also enforces `q.length >= 3` to prevent wildcards).

### 5.4 API Endpoints (`routes.js`)
- **`POST /api/leads` (Create Lead)**: 
  - Validates payload and ensures no duplicate phone number exists.
  - Calls LSQ `Lead.Create`.
  - Immediately fires LSQ **Activity 282 (Outreach Lead Created)** with the user's email and GPS coords (lat/lng).
  - Forces an OwnerId update via `Lead.Update` to assign the lead correctly.
- **`GET /api/leads/search` (Global Search)**: 
  - Searches LSQ for leads. 
  - **RBAC Enforced**: Normal executives are hardcoded to search *only* their own email. Managers/Admins can search team-wide.
- **`POST /api/create-user`**: 
  - Strictly limited to `admin` role. 
  - Creates Auth user, sets Custom Claims (Role), and saves profile to Firestore.
- **`POST /api/push-recording`**: Pushes an audio recording request to the `pushQueue` (processed asynchronously).
- **`GET /api/sync-now`**: Manually triggers the LSQ -> Firestore sync pipeline.

### 5.5 Sync Engine & Queue
- **`sync.js` (LSQ -> Firestore)**: Periodically pulls recently modified Leads and Activities from LeadSquared using their respective Get APIs, parses them, and updates Firestore `crmActivities`.
- **`pushQueue.js` (Firestore -> LSQ)**: A Firestore `onDocumentCreated` trigger. When the mobile app writes a new activity to `pushQueue`, this function executes the LSQ `ProspectActivity.svc/Create` API, ensuring the mobile app is never blocked waiting for slow LSQ API responses.

### 5.6 LSQ Field Mapping (mx_Custom_* → Firestore)
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
Profiles for all staff.
```
email: string
role: string ('executive' | 'teamLead' | 'seniorManager' | 'admin')
name: string
phone: string
regionId: string
managerId: string
seniorManagerId: string
```

### `crmActivities/{activityId}`
Aggregated cache of LSQ activities and leads, optimized for fast reads by the Web Dashboard.
```
lsqActivityId: string       // LSQ ProspectActivityId
lsqLeadId: string           // LSQ RelatedProspectId
executiveId: string          // Firestore userId
executiveEmail: string       // lowercase email

schoolName: string
activityType: string         // 'Initial Visit', 'Follow up', 'Seminar'
typeOfWalkIn: string         // 'Scheduled', 'Unscheduled'
walkInStatus: string         // 'Conducted', 'Refused Entry - RE', etc.
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

### `dailyTracks/{executiveId}_{yyyyMMdd}`
Stores the GPS routes for associates. Used by DistanceTracker.
```
userId: string
date: string format: YYYYMMDD
routeArray: Array of LocationPoint { lat, lng, ts, speed, accuracy }
status: string ('active' | 'ended')
```

### `pushQueue/{autoId}`
Offline-first sync queue. Processed by `processPushQueue` Cloud Function.
```
action: 'CREATE_ACTIVITY' | 'UPDATE_ACTIVITY' | 'PUSH_RECORDING'
activityId: string
leadId: string
executiveId: string
notes: string
activityData: Array<{ SchemaName: string, Value: string }>
storageUrl: string          // For PUSH_RECORDING
recordingId: string         // For PUSH_RECORDING
schoolName: string
status: 'pending' | 'completed' | 'failed'
error: string
createdAt: Timestamp (server)
completedAt: Timestamp
failedAt: Timestamp
```

### `locationRequests/{autoId}`
Used to ping associates for real-time location.
```
executiveId: string
requestedAt: Timestamp (server)
status: 'pending' | 'processing' | 'fulfilled' | 'error'
response: { lat, lng, ts }
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
- **Usage**: Audio recordings uploaded as `video` resource type. Image watermarks handled via transformations.

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

*All previously known critical bugs have been resolved in recent development cycles. The system is currently stable.*

**Recently Resolved Issues:**
1. **API_BASE hardcoding** (`localhost:3001` in mobile app) has been fixed to correctly route to the host environment.
2. **Dashboard infinite loops** caused by unmemoized `todayStart`/`todayEnd` dependencies have been patched.
3. **Vite Hot-Reload Crashes** caused by duplicate Firebase `secondaryApp` initializations are resolved.
4. **Push Queue omissions** (missing `PUSH_RECORDING` action in offline queue) have been fully handled in `usePushToLs.ts`.
5. **Timezone Mismatches** for UTC vs local time boundaries in the executive dashboard have been corrected via DatePicker memoization.

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

---

## 11. Core Security Features & Mitigations (Recently Implemented)

### 11.1 DDoS & Scraping Protection (Webhook Server)
- **Implementation**: The webhook server now utilizes `express-rate-limit` to mitigate brute-force and scraping attacks.
- **Global Limiter**: Applied globally across all API routes to ensure the Firebase backend is not overwhelmed. Set to a strict `100 requests per 15 minutes` per IP address.
- **Search Limiter**: The `/api/leads/search` endpoint connects directly to the LeadSquared CRM. Since LSQ quotas are expensive, this endpoint is highly restricted. It enforces a max of `20 requests per 15 minutes` per IP.
- **Payload Validation**: The search endpoint rejects any queries shorter than 3 characters (`q.length < 3`), completely preventing wildcard dumps (e.g. searching "a" to dump thousands of leads).

### 11.2 Role-Based Access Control (RBAC) via Firebase Custom Claims
- **Implementation**: Traditional setups require a database lookup on every API request to verify if a user is an admin. To improve latency and reduce DB costs, the backend relies purely on Firebase Custom Claims.
- **Token Injection**: When an Admin creates a new user via `/api/create-user`, the webhook server uses the Firebase Admin SDK to forcefully embed a `role` claim inside the user's Auth Token.
- **Middleware**: The `authMiddleware.js` function simply decodes the JWT and reads `decodedToken.role`. If the route demands an `admin` and the role is `executive`, it rejects instantly with 403 Forbidden without ever touching Firestore.
- **Self-Isolation**: Regular executives can only ever search for leads tied to their specific `email`. The backend enforces this mapping regardless of what email the user requests in the API payload, making horizontal escalation impossible.

### 11.3 GPS Spoofing Defenses
- The tracking engine was refactored to implement hardware constraints that are mathematically impossible to spoof through simple mock-location apps.
- **Bearing Correlation**: Fake GPS apps typically draw straight lines, which causes unnatural "bearing jitter" at low speeds. Gate 4 of the `locationTracker.ts` aggressively rejects these mathematical anomalies.
- **Proximity Enforcements**: The `WalkInSessionScreen` strictly checks that the user's hardware GPS is within `300m` of the target school's known location in LSQ. If this check fails, the walk-in form is blocked entirely.


## 12. Full Project Directory Tree

```
app/src/types/index.ts
app/src/navigation/RootNavigator.tsx
app/src/navigation/AuthNavigator.tsx
app/src/navigation/ExecutiveNavigator.tsx
app/src/stores/walkInStore.ts
app/src/stores/authStore.ts
app/src/stores/tasksStore.ts
app/src/stores/crmActivitiesStore.ts
app/src/utils/lsqMappers.ts
app/src/utils/distance.ts
app/src/utils/logger.ts
app/src/utils/gpsValidation.ts
app/src/utils/safeFormat.ts
app/src/utils/setupLogging.ts
app/src/screens/auth/OTPScreen.tsx
app/src/screens/auth/LoginScreen.tsx
app/src/screens/PermissionGateScreen.tsx
app/src/screens/executive/AddLeadScreen.tsx
app/src/screens/executive/LeadsScreen.tsx
app/src/screens/executive/LeadDetailScreen.tsx
app/src/screens/executive/BugReportScreen.tsx
app/src/screens/executive/TasksScreen.tsx
app/src/screens/executive/WalkInSessionScreen.tsx
app/src/screens/executive/DashboardScreen.tsx
app/src/screens/executive/MeetingNotesScreen.tsx
app/src/components/tasks/TaskTabs.tsx
app/src/components/tasks/TaskCard.tsx
app/src/components/tasks/TaskList.tsx
app/src/components/tasks/TasksHeader.tsx
app/src/components/tasks/TaskSectionHeader.tsx
app/src/components/tasks/index.ts
app/src/components/leads/LeadCard.tsx
app/src/components/dashboard/DailyStatsCard.tsx
app/src/components/dashboard/OngoingWalkInCard.tsx
app/src/components/dashboard/GeofenceAlert.tsx
app/src/components/dashboard/UpcomingTasksList.tsx
app/src/components/dashboard/DashboardDatePicker.tsx
app/src/components/dashboard/ActivityList.tsx
app/src/components/dashboard/TrackingStatusIndicator.tsx
app/src/components/dashboard/DashboardHeader.tsx
app/src/components/dashboard/index.ts
app/src/components/dashboard/StartDayModal.tsx
app/src/components/walk-in/WalkInForm.tsx
app/src/components/meeting-notes/RecordingItem.tsx
app/src/components/meeting-notes/PushToLsModal.tsx
app/src/__tests__/gpsValidation.test.ts
app/src/__tests__/useWalkInSync.test.ts
app/src/__tests__/filterLocationPoints.test.ts
app/src/__tests__/useLocationPinger.test.ts
app/src/__tests__/firestoreSync.test.ts
app/src/hooks/useLeadSearch.ts
app/src/hooks/useMeetingAudioRecorder.ts
app/src/hooks/useLocationPinger.ts
app/src/hooks/useMeetingRecordings.ts
app/src/hooks/useWalkInAudioRecorder.ts
app/src/hooks/useWalkInForm.ts
app/src/hooks/usePushToLs.ts
app/src/hooks/useWalkInSync.ts
app/src/hooks/useFailedSyncs.ts
app/src/tracking/motionDetector.ts
app/src/tracking/useOutreachTracking.ts
app/src/tracking/firestoreSync.ts
app/src/tracking/locationTracker.ts
app/src/tracking/taskRegistry.ts
app/src/services/firestore.ts
app/src/services/firebase.ts
app/src/services/storage.ts
app/src/services/headlessTask.ts
app/src/services/recording.ts
app/src/services/audioUploadQueue.ts
app/src/services/auth.ts
website/src/App.tsx
website/src/main.tsx
website/src/firebase.ts
website/src/App.css
website/src/stores/authStore.ts
website/src/index.css
website/src/components/ui/card.tsx
website/src/components/ui/popover.tsx
website/src/components/ui/toaster.tsx
website/src/components/ui/sheet.tsx
website/src/components/ui/scroll-area.tsx
website/src/components/ui/tooltip.tsx
website/src/components/ui/calendar.tsx
website/src/components/ui/avatar.tsx
website/src/components/ui/dialog.tsx
website/src/components/ui/button.tsx
website/src/components/ui/toast.tsx
website/src/components/ui/EmptyState.tsx
website/src/components/ui/input.tsx
website/src/components/pipeline/PipelineSeminars.tsx
website/src/components/pipeline/CrmTableView.tsx
website/src/components/pipeline/PipelineBoard.tsx
website/src/components/pipeline/types.ts
website/src/components/pipeline/SchoolDetailSheet.tsx
website/src/components/tasks/TaskActionMenu.tsx
website/src/components/tasks/TaskFilters.tsx
website/src/components/tasks/TaskListView.tsx
website/src/components/tasks/TaskCalendarView.tsx
website/src/components/tasks/TaskCardView.tsx
website/src/components/layout/Sidebar.tsx
website/src/components/admin/OrgChart.tsx
website/src/components/dashboard/AssociateTimeline.tsx
website/src/components/dashboard/TeamSidebar.tsx
website/src/components/dashboard/AssociateHeader.tsx
website/src/components/dashboard/map/mapIcons.ts
website/src/components/dashboard/AssociateMap.tsx
website/src/components/dashboard/LeadAccessRequests.tsx
website/src/components/dashboard/GlobalStats.tsx
website/src/components/dashboard/AssignTaskModal.tsx
website/src/components/AnalyticsTab.tsx
website/src/components/GlobalDataFilter.tsx
website/src/components/CrmActivityCard.tsx
website/src/components/TimelineActivityDialog.tsx
website/src/components/GlobalErrorBoundary.tsx
website/src/hooks/useTaskCenter.ts
website/src/hooks/useDashboardData.ts
website/src/hooks/use-toast.ts
website/src/hooks/useCrmData.ts
website/src/lib/utils.ts
website/src/lib/distance.ts
website/src/lib/constants.ts
website/src/lib/osrmService.ts
website/src/lib/gpsUtils.ts
website/src/lib/timelineBuilder.ts
website/src/assets/hero.png
website/src/assets/greek man.png
website/src/assets/vite.svg
website/src/assets/react.svg
website/src/pages/TaskCenter.tsx
website/src/pages/BugReport.tsx
website/src/pages/Login.tsx
website/src/pages/Dashboard.tsx
website/src/pages/admin/UserManagement.tsx
website/src/pages/Analytics.tsx
website/src/pages/DistanceTracker.tsx
website/src/pages/DevLogs.tsx
website/src/pages/CRMHub.tsx
website/src/pages/LeadRequests.tsx
website/src/pages/ActivityFeed.tsx
webhook-server/src/config/config.js
webhook-server/src/api/authMiddleware.js
webhook-server/src/api/routes.js
webhook-server/src/services/claims.js
webhook-server/src/services/locationRequests.js
webhook-server/src/services/sync.js
webhook-server/src/services/lsq.js
webhook-server/src/services/pushQueue.js

```
