# LabPortal Documentation

This document provides a comprehensive overview of the LabPortal application, including its purpose, technology stack, architecture, project structure, and core features.

## 1. Project Overview

LabPortal is a web application designed to serve as a central hub for medical laboratories and clinics. It provides a multi-tenant platform where administrators can manage clinics and patients, and clinic users (clients) can view their data and reports.

The application supports two main user roles:
- **Admin**: Has full access to the system, including managing clinics, patients, and all associated data.
- **Client**: Represents a user from a specific clinic. They have restricted access, primarily to view their clinic's dashboard and reports.

## 2. Tech Stack

The project is built with a modern technology stack:

- **Frontend Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Primitives**: [Radix UI](https://www.radix-ui.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Data Tables**: [TanStack Table](https://tanstack.com/table/v8)
- **State Management**: React Context API
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Backend (BaaS)**: [Supabase](https://supabase.io/)
- **Linting**: [ESLint](https://eslint.org/)
- **Deployment**: [Vercel](https://vercel.com/)

## 3. Architecture and Design Patterns

### 3.1. Project Structure Philosophy

The project follows a **feature-based directory structure**. Code is organized by functionality (e.g., `features/clinics`, `features/patients`) rather than by type (e.g., `components/`, `pages/`). This approach offers several advantages:
- **Scalability**: It's easier to add or modify features without affecting other parts of the application.
- **Maintainability**: Related files are co-located, making it simpler to understand and work on a specific feature.
- **Clear Ownership**: Teams or developers can take ownership of entire features.

### 3.2. UI Component Architecture

The application adopts a `shadcn/ui`-like methodology for its UI components, located in `src/components/ui`. This is not a component library in the traditional sense, but rather a collection of reusable components built using:
- **Base Primitives**: Unstyled, accessible components from [Radix UI](https://www.radix-ui.com/).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
- **Composition**: Components are designed to be composed together to build complex UIs.

This approach avoids dependency lock-in and gives developers full control over the code and styling of components.

### 3.3. Data Flow and State Management

- **Global State**: Global application state, such as user authentication status and profile information, is managed via React's Context API. The `AuthContext` (`src/context/AuthContext.jsx`) is the primary provider for this.
- **Local State & Data Fetching**: For feature-specific data, the application follows a pattern of fetching data directly within the components that need it. This is typically done using `useEffect` and `useState` hooks to call Supabase client methods. This keeps data fetching logic co-located with the components that use the data.

### 3.4. Shared Components and Layouts

```
/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images, svgs, etc.
│   │   ├── common/      # Common components like Routes, ProtectedRoutes
│   │   ├── forms/       # Reusable form components
│   │   ├── layouts/     # Layout components (e.g., PageLayout)
│   │   ├── shared/      # Shared components across the app (Header, Sidebar)
│   │   └── ui/          # Low-level UI primitives (Button, Card, etc.)
│   ├── context/         # React context providers (e.g., AuthContext)
│   ├── features/        # Core application features (modules)
│   │   ├── auth/        # Authentication pages and logic
│   │   ├── clinics/     # Clinic management feature
│   │   ├── dashboard/   # Dashboard feature
│   │   ├── patients/    # Patient management feature
│   │   └── reports/     # Report management feature
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Libraries and utility functions (supabaseClient, utils)
│   ├── pages/           # General pages (NotFound, Unauthorized)
│   └── services/        # API service calls (currently not used extensively)
├── supabase/            # Supabase configuration and functions
│   └── functions/       # Serverless edge functions
└── ...                  # Config files (vite.config.js, package.json, etc.)
```

## 4. Core Features

This section details the primary features of LabPortal. The application's functionality is divided into modules based on features, located in the `src/features` directory.

### 4.1. Authentication

The authentication module handles all aspects of user identity and access.

-   **Login & Session Management**: Users log in via a form (`login-form.jsx`). The application creates a session and persists it.
-   **Password Management**:
    -   **Forgot Password**: Users can request a password reset link to their email (`forgetPassword-form.jsx`).
    -   **Reset Password**: Users can set a new password after following the reset link (`reset-password-form.jsx`).
-   **Email Verification**: The `EmailVerificationCallback.jsx` component handles the logic after a user clicks the verification link sent to their email, activating their account.
-   **Role-Based Access Control (RBAC)**:
    -   The `AuthContext` provides the user's role (`admin` or `client`) throughout the application.
    -   The `RoleProtectedRoute.jsx` component wraps routes to ensure only users with allowed roles can access them. Unauthorized users are redirected.

### 4.2. Dashboard

The dashboard serves as the main landing page after a user logs in. Its content is tailored to the user's role to provide relevant information at a glance.

-   **Admin Dashboard (`AdminDashboard.jsx`)**: Provides an administrative overview, likely with statistics about all clinics, patients, and recent reports. It serves as the central hub for admins to navigate to management pages.
-   **Client Dashboard (`ClientDashboard.jsx`)**: Offers a focused view for clinic users. It likely displays key metrics, recent reports, and quick access to their clinic's specific information.
-   **Dynamic Rendering**: The main dashboard component (`src/features/dashboard/index.jsx`) dynamically renders either the `AdminDashboard` or `ClientDashboard` based on the logged-in user's role.

### 4.3. Clinic Management (Admin only)

This feature allows administrators to manage all aspects of clinics.

-   **Clinic List (`ClinicList.jsx`)**: Displays all clinics in a tabular format, likely using the reusable `data-table.jsx` component.
-   **CRUD Operations**:
    -   **Create/Update**: Admins can add new clinics or update existing ones using `ClinicForm.jsx`.
    -   **View Details**: `ClinicDetails.jsx` provides a comprehensive view of a single clinic's information.
-   **Clinic-Specific Reports**: Admins can view and manage reports associated with a specific clinic through components like `ClinicReportDetails.jsx` and `UpdateClinicReportDialog.jsx`.

### 4.4. Patient Management (Admin only)

This feature is dedicated to managing patient records across all clinics.

-   **Patient Table (`PatientsTable.jsx`)**: Lists all patients with searching and filtering capabilities (`PatientsFilters.jsx`).
-   **Patient Profiles**:
    -   Admins can create and update patient information using `PatientForm.jsx` and `PatientUpdate.jsx`.
    -   `PatientView.jsx` shows a detailed profile for a single patient.
-   **Patient-Specific Reports**: Admins can manage reports tied to a specific patient using `PatientReports.jsx` and `ReportForm.jsx`.

### 4.5. Report Management

This feature provides a centralized view for accessing and managing reports. The data displayed is scoped based on the user's role.

-   **Reports Table (`ReportsTable.jsx`)**: A filterable and searchable table (`ReportsFilters.jsx`) that shows a list of reports.
    -   **Admins**: See reports from all clinics and patients.
    -   **Clients**: See only the reports associated with their own clinic.
-   **Report Operations**:
    -   Users can view `ReportDetails.jsx`.
    -   Admins can add new reports (`AddReportDialog.jsx`) and update existing ones (`UpdateReportDialog.jsx`).

### 4.6. User Account Management

This feature allows users to manage their own profile and settings.

-   **Route**: `/account`
-   **Profile Details**: The main view (`src/features/user/index.jsx`) displays the current user's information.
-   **Password Change**: Users can change their password using the `PasswordChangeForm.jsx`.

## 5. Backend (Supabase)

Supabase serves as the all-in-one backend, providing database, authentication, storage, and serverless function capabilities.

- **Supabase Client**: The file at `src/lib/supabaseClient.js` initializes and exports the Supabase client, which is a singleton used throughout the application to interact with Supabase services.
- **Authentication**: Supabase Auth handles all user management. User roles, which are central to the RBAC system, are stored in the `raw_user_meta_data` field for each user in the `auth.users` table.
- **Database**: The application's data (clinics, patients, reports, etc.) is stored in the Supabase PostgreSQL database. The schema is designed to support the multi-tenant nature of the application.
- **Edge Functions**: The `supabase/functions` directory contains serverless functions written in TypeScript/JavaScript that run on Deno.
    - `invite-user`: This function likely handles the logic for sending invitations to new users. It may create a new user entry in Supabase Auth with an invitation status and send a magic link or invitation email.
    - `handle-invitation`: This function would handle the verification of an invitation when a user signs up.

## 6. Getting Started

To run the project locally, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env.local` file in the root of the project and add your Supabase project URL and anon key. You can find these in your Supabase project's API settings.
    ```
    VITE_SUPABASE_URL=your-supabase-project-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173` (or another port if 5173 is in use).

### Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Lints the code using ESLint.
- `npm run preview`: Serves the production build locally.

## 7. Deployment

The application is configured for deployment on [Vercel](https://vercel.com/). The `vercel.json` file in the root directory contains configuration for the build and deployment process, including how Vercel should handle routes and serverless functions. 