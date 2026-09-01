# SmartAttend: Cloud-Based QR Student Attendance Management System

**SmartAttend** is a production-grade, responsive Web Application designed for educational institutions to track student attendance in real time using physical QR-coded student ID cards. Built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **Firebase** (Authentication + Cloud Firestore), SmartAttend turns any smartphone, tablet, or laptop camera into a lightning-fast attendance scanner.

---

## 1. Key Features

- **Continuous Camera QR Recognition**: Real-time browser-based QR scanner using device cameras with auto-focus, rear camera preference, multi-camera selection, and manual fallback entry.
- **Instant Visual & Audio Feedback**: Large, high-contrast animated cards (Green for Present, Amber for Duplicate, Red for Unknown/Inactive) accompanied by browser synthesized sound chimes and confetti.
- **Atomic Duplicate Attendance Prevention**: Guarantees zero duplicate attendance records per student per day across rapid double-scans or simultaneous devices using deterministic document keys (`{studentId}_{date}`).
- **Timezone-Aware Normalization**: Normalized date boundaries in institution timezone (Default: `Asia/Colombo`) preventing midnight shifts across different devices.
- **Dynamic Absence Computation**: Calculates absent students dynamically from the active student roster and recorded attendance without generating hundreds of redundant empty database documents.
- **Role-Based Access Control (RBAC)**: Secure separation between `ADMIN` and `STAFF` roles with route guards and database security rules.
- **Printable Student ID Badges**: High-resolution ID card preview with custom branding, student details, and scannable QR code with 1-click Print and PNG download.
- **Batch CSV Import & Export**: One-click roster onboarding via CSV with duplicate validation; full CSV attendance register export and print-ready report stylesheets.
- **Offline & Low-Bandwidth Resilience**: Real-time Firestore synchronization with local fallback persistence for zero-interruption evaluation.

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Icons & UI**: Lucide React, Canvas Confetti
- **Backend / Cloud**: Firebase Authentication (Email/Password), Cloud Firestore
- **Scanning Engine**: `html5-qrcode` & HTML5 WebRTC Video Stream
- **QR Generation**: `qrcode` (Canvas & SVG renderer)
- **Testing**: Vitest unit test suite

---

## 3. Project Architecture

```
smartattend/
├── firestore.rules                  # Production Firestore Security Rules
├── firestore.indexes.json           # Composite Firestore Indexes
├── firebase.json                    # Firebase Hosting & emulator config
├── .env.local.example               # Firebase environment variables template
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root Layout with AuthProvider & ToastProvider
│   │   ├── page.tsx                 # Root redirect
│   │   ├── login/page.tsx           # SaaS login page + Quick Evaluation triggers
│   │   ├── dashboard/page.tsx       # Live metrics, quick scan, recent activity
│   │   ├── attendance/
│   │   │   ├── page.tsx             # Attendance overview & manual override
│   │   │   └── scan/page.tsx         # Full-screen continuous camera QR scanner
│   │   ├── students/
│   │   │   ├── page.tsx             # Student directory, search, filter, CSV import
│   │   │   └── [id]/page.tsx        # Student profile, attendance history, QR badge
│   │   ├── reports/page.tsx         # Daily & range attendance reports, CSV/Print
│   │   ├── users/page.tsx           # [Admin-only] Staff user management & roles
│   │   └── settings/page.tsx        # [Admin-only] School name, timezone, seeder
│   ├── components/
│   │   ├── layout/                  # Sidebar, MobileHeader, AppLayout, ProtectedRoute
│   │   ├── ui/                      # Button, Input, Select, Card, Badge, Modal, Toast
│   │   ├── scanner/                 # QrCameraScanner, ScanSuccessCard, ScanHistoryList
│   │   ├── students/                # StudentTable, StudentForm, StudentQrBadge
│   │   └── reports/                 # AttendanceSummary, AttendanceTable
│   ├── lib/
│   │   ├── firebase/                # Firebase app, auth, and firestore references
│   │   ├── auth/                    # AuthContext, RBAC permission matrices
│   │   ├── attendance/              # Atomic recording service & stats math
│   │   ├── students/                # Student CRUD & QR queries
│   │   ├── settings/                # Institute settings & timezone storage
│   │   └── utils/                   # QR parser, date normalization, sound, CSV
│   └── types/                       # TypeScript schemas for User, Student, Attendance
└── tests/                           # Vitest automated test suite
```

---

## 4. Firestore Database Structure

### Collections:
1. `users/{userId}`: User account profiles, email, displayName, role (`ADMIN` | `STAFF`), status (`ACTIVE` | `INACTIVE`).
2. `students/{studentId}`: Student records with `studentId`, `fullName`, `class`, `section`, `qrCodeValue`, `status`.
3. `attendance/{studentId}_{date}`: Daily attendance record with snapshot fields (`studentNameSnapshot`, `classSnapshot`), timestamp, formatted time, `markedBy`, and `method: "QR_SCAN"`.
4. `settings/system`: Institution profile, school name, default timezone (`Asia/Colombo`), and cutoff times.

---

## 5. Firebase Setup & Configuration

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g. `smartattend-cloud`).
3. Enable **Authentication** -> Select **Email/Password** as the sign-in method.
4. Enable **Cloud Firestore** -> Create database in **Production mode**.

### Step 2: Configure Environment Variables
Create a file named `.env.local` in the project root:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYourApiKeyHere
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 6. Deploying Firestore Security Rules & Indexes

Deploy the included security rules and composite indexes:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to your Google account
firebase login

# Deploy rules and indexes
firebase deploy --only firestore
```

---

## 7. Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Unit Tests
```bash
npm test
```

### 3. Start Local Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. First Run & Admin Setup Guide

1. **Sign In**:
   - Open `/login`.
   - You can sign in with your Firebase email/password or click **Admin Role** under **Quick Evaluation Access**.
2. **Seed Sample Students**:
   - On first run, click **Load Sample Students** on the dashboard or navigate to **Settings** -> **Load 10 Realistic Sample Students**.
   - This registers `STU001` (John Silva), `STU002` (Sarah Perera), `STU003` (David Fernando), etc.
3. **Print or Preview QR Badges**:
   - Navigate to **Students** -> Click the eye icon next to any student (e.g. `STU001`).
   - View or print the physical student ID card with scannable QR.
4. **Scan Attendance**:
   - Open **Attendance Scanner** (`/attendance/scan`).
   - Allow camera permissions.
   - Hold up the student QR code.
   - The system instantly detects the code, checks today's record, marks the student as **PRESENT**, plays an audio confirmation, and resumes scanning in 2 seconds.
5. **Verify Duplicate Prevention**:
   - Scan the same QR code again immediately.
   - The scanner displays **ALREADY MARKED** with the exact original timestamp and prevents duplicate database entries.
6. **Generate Reports**:
   - Open **Reports** (`/reports`).
   - Observe real-time attendance rate, scanned students marked as **PRESENT**, and unrecorded active students automatically listed as **ABSENT**.
   - Click **Export CSV** or **Print Report**.

---

## 9. Troubleshooting Camera Permissions

If the browser blocks camera access:
- **Mobile Chrome (Android)**: Tap the lock icon in the URL bar -> Permissions -> Camera -> Allow.
- **Mobile Safari (iOS)**: Tap `aA` in the URL bar -> Website Settings -> Camera -> Allow.
- **Desktop (Chrome/Edge/Firefox)**: Click the camera/lock icon on the left side of the address bar and select **Allow**.
- **Manual Input Fallback**: Click **Manual ID** in the top bar of the scanner to type or paste any student ID (e.g. `STU001`) without a camera.

---

## 10. Deploying to Firebase Hosting

```bash
# Build static export
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your system is now live on your custom HTTPS Firebase URL!
