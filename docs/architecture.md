Markdown

# AI-powered Organization Chart Generator Fullstack Architecture Document

### **1. Introduction**

[cite_start]This document outlines the complete fullstack architecture for the AI-powered Organization Chart Generator, including backend systems, frontend implementation, and their integration. [cite: 880, 881] [cite_start]It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack. [cite: 881]

#### **Starter Template or Existing Project**

Based on the project requirements for rapid MVP development and future scalability, the architecture will be based on the modern Vercel/Next.js ecosystem. While not a specific pre-built template, this approach uses a standard, best-practice configuration that functions as a powerful starting point.

#### **Change Log**

| Date          | Version | Description               | Author             |
| :------------ | :------ | :------------------------ | :----------------- |
| July 16, 2025 | 1.0     | Initial architecture draft | Winston, Architect |

### **2. High Level Architecture**

#### **Technical Summary**

[cite_start]The architecture will be a **Next.js monorepo** deployed on the **Vercel platform**. [cite: 891] [cite_start]This provides a unified full-stack development experience, with the frontend, API routes (as serverless functions), and shared code all managed within a single repository. [cite: 891] We will leverage Vercel's managed infrastructure, including Vercel KV for data persistence and Vercel Blob for file storage, to accelerate development and ensure scalability. This approach directly supports the "Serverless Functions within a Monolith" strategy defined in the PRD.

#### **Platform and Infrastructure Choice**

* [cite_start]**Platform:** Vercel [cite: 896]
* **Key Services:**
    * [cite_start]**Next.js:** The full-stack framework for both frontend and serverless API routes. [cite: 896]
    * [cite_start]**Vercel KV:** A simple, durable Redis database for storing chart and user data. [cite: 896]
    * [cite_start]**Vercel Blob:** For securely handling file uploads for the "Intelligent Import" feature. [cite: 896]
* **Rationale:** Vercel is the creator of Next.js and provides a seamless, zero-configuration deployment platform. This choice minimizes time spent on infrastructure management and allows us to focus entirely on building the application's features.

#### **Repository Structure**

* [cite_start]**Structure:** Monorepo [cite: 897]
* [cite_start]**Monorepo Tool:** npm workspaces (built-in, simple, and effective for this scale). [cite: 897]
* **Rationale:** As established in the PRD, a monorepo simplifies dependency management and allows for easy code sharing between the frontend and backend, which is ideal for this project.

#### **High Level Architecture Diagram**

```mermaid
graph TD
    subgraph "User"
        A[Browser]
    end
    subgraph "Vercel Platform"
        B[Next.js Application] --> C[API Routes / Serverless Functions]
        C -- "Stores/Retrieves Chart Data" --> D[Vercel KV]
        C -- "Handles File Uploads" --> E[Vercel Blob]
    end
    A -- "Interacts With" --> B
Architectural Patterns

Jamstack: For a high-performance frontend served from a global edge network. 


Serverless Functions: For our backend API, ensuring automatic scaling and low maintenance overhead. 


Monorepo: For unified code management and simplified dependencies. 


Repository Pattern: For backend logic, to abstract data access from our business logic, which will make the application easier to test and maintain. 

3. Tech Stack
Category	Technology	Version	Purpose	Rationale
Language	TypeScript	5.4.5	Primary language for both frontend and backend	Provides type safety and scalability, ideal for a monorepo.
Framework	Next.js	14.2.3	Full-stack framework for UI and serverless APIs	The premier framework for React, with seamless Vercel integration.
UI Components	Shadcn/ui	latest	Collection of beautifully designed, accessible components	Highly customizable and works perfectly with Tailwind CSS.
Styling	Tailwind CSS	3.4.3	Utility-first CSS framework	Enables rapid UI development and easy customization.
State Mngmt	Zustand	4.5.2	Minimalist state management library	Simple, fast, and scalable without the boilerplate.
API Style	tRPC	11.0.0-rc.352	Typesafe API layer	Provides end-to-end typesafety between client and server.
Database	Vercel KV	N/A	Durable Redis for data persistence	Managed by Vercel, easy to use, and performant for MVP needs.
File Storage	Vercel Blob	N/A	File storage for uploads	Managed by Vercel, secure, and simple for handling imports.
Authentication	Auth.js (NextAuth)	5.0.0-beta.18	Authentication for Next.js	The standard for authentication in Next.js, flexible and secure.
Testing	Vitest	1.6.0	Test runner for unit/integration tests	Modern, fast, and compatible with both frontend and backend.
E2E Testing	Playwright	1.44.1	End-to-end testing framework	Powerful and reliable for testing user flows.
CI/CD	Vercel	N/A	Continuous Integration & Deployment	Natively integrated with GitHub for automatic deployments.
Logging	Vercel Logs	N/A	Real-time log streaming	Built-in to the Vercel platform for easy debugging.

Export to Sheets
4. Data Models
1. Organization

Purpose: To represent a single, self-contained organizational chart. 

TypeScript Interface:

TypeScript

interface Organization {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}
2. Employee

Purpose: To represent a single person or node within an Organization. 

TypeScript Interface:

TypeScript

interface Employee {
  id: string;
  name: string;
  title: string;
  organizationId: string;
  managerId: string | null;
  customFields?: Record<string, any>;
}
3. User

Purpose: To represent an authenticated user of the application. 

TypeScript Interface:

TypeScript

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}
5. API Specification (tRPC)
TypeScript

import { z } from "zod";

export const appRouter = t.router({
  organization: t.router({
    create: protectedProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ ctx, input }) => { /* ... */ }),

    list: protectedProcedure
      .query(async ({ ctx }) => { /* ... */ }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => { /* ... */ }),

    updateManager: protectedProcedure
      .input(z.object({ employeeId: z.string(), newManagerId: z.string() }))
      .mutation(async ({ ctx, input }) => { /* ... */ }),
      
    processCommand: protectedProcedure
      .input(z.object({ organizationId: z.string(), command: z.string() }))
      .mutation(async ({ ctx, input }) => { /* ... */ }),
      
    createUploadUrl: protectedProcedure
      .input(z.object({ fileName: z.string(), fileType: z.string() }))
      .mutation(async ({ ctx, input }) => { /* ... */ }),
  }),
});

export type AppRouter = typeof appRouter;
6. Components

Web UI (Frontend): Renders the UI and handles user interaction. 


API Server (Backend): Exposes business logic via tRPC and handles authentication. 


Authentication Service: Manages user login and sessions via Auth.js. 


AI Parsing Service: Contains logic for interpreting uploaded files and text commands. 


Data Persistence Service: Stores all data in Vercel KV. 


File Storage Service: Manages file uploads using Vercel Blob. 

7. Unified Project Structure
Plaintext

/
├── apps/
│   ├── web/              # The Next.js frontend application
│   └── api/              # The Next.js backend (tRPC API routes)
├── packages/
│   ├── shared/           # Shared TypeScript types, utilities
│   ├── ui/               # Shared React components
│   └── config/           # Shared configurations
├── .env.example
├── package.json
└── README.md
8. Coding Standards
Critical Rules

Type Sharing: All types shared between the frontend (web) and backend (api) MUST be defined in the packages/shared directory and imported from there. 


API Communication: The frontend MUST interact with the backend exclusively through the auto-generated, typesafe tRPC client.  Direct 

fetch calls to our own API are forbidden.


Environment Variables: All environment variables MUST be accessed through a centralized configuration module.  Direct use of 

process.env within component or business logic is forbidden.


Component Scoping: All UI components will be created within the packages/ui directory to promote reusability, unless they are specific to a single page route within the apps/web application. 

Naming Conventions
Element	Convention	Example
Components	PascalCase	ChartViewer.tsx
API Procedures	camelCase	listOrganizations
Files/Folders	kebab-case	chart-viewer/
