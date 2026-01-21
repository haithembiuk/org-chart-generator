# AI-powered Organization Chart Generator Product Requirements Document (PRD)

### **1. Goals and Background Context**

#### **Goals**

* To create a powerful, intuitive tool that simplifies the creation and maintenance of organizational charts.
* To deliver a focused MVP centered on efficient data import (`Intelligent Import`).
* To provide a seamless editing experience (`Visual Drag-and-Drop Editor`).
* To leverage AI for fast updates (`AI Command-Based Updates`).

#### **Background Context**

This project aims to address the common pain points associated with organizational chart management. Traditional tools often require tedious manual data entry and are difficult to keep up-to-date. By leveraging AI for data input and providing a modern, intuitive editor, the AI-powered Organization Chart Generator will save HR professionals and managers significant time and effort, while providing a valuable, living resource for the entire organization.

#### **Change Log**

| Date          | Version | Description          | Author   |
| :------------ | :------ | :------------------- | :------- |
| July 16, 2025 | 1.0     | Initial PRD draft    | John, PM |

### **2. Requirements**

#### **Functional**

1. **FR1**: The system must allow a user to upload a file (e.g., CSV, XLSX) and have the AI automatically parse employee data and reporting structures to generate an organizational chart.
2. **FR2**: The system must provide a visual editor that allows a user to drag and drop employee nodes to modify the organizational hierarchy.
3. **FR3**: The system must provide an input field where a user can submit a text command (e.g., "Update: Maria now reports to David") to modify the organizational hierarchy, with the AI interpreting and applying the change.

#### **Non-Functional**

1. **NFR1**: The user interface for chart editing must be highly responsive, with visual feedback for user actions (like drag and drop) appearing in under 200ms.
2. **NFR2**: The application must be intuitive enough for a first-time HR user to successfully create or update a chart in under 10 minutes without requiring documentation.
3. **NFR3**: The file import process should successfully handle files containing up to 500 employees.

### **3. User Interface Design Goals**

#### **Overall UX Vision**

The vision is a clean, minimalist, and highly intuitive interface that empowers users to create and manage charts effortlessly. The primary goal is to reduce complexity and make the entire process feel fluid and responsive, turning a typically tedious task into a quick and pleasant one.

#### **Key Interaction Paradigms**

The core interactions will be file-based (a simple import process) and direct manipulation (drag-and-drop editing), supplemented by conversational AI commands for quick, power-user updates.

#### **Core Screens and Views**

For the MVP, we will need to design the following core areas:

* **Dashboard / Chart View**: The main interface where the generated organizational chart is displayed and interacted with.
* **Import Modal**: A simple, focused pop-up or screen for handling the file upload process.
* **Edit/Command Panel**: A dedicated area of the interface for managing drag-and-drop actions and entering AI text commands.

#### **Accessibility**

* **WCAG AA**: The application will be designed to meet WCAG 2.1 Level AA compliance standards, ensuring it is usable by people with a wide range of disabilities.

#### **Branding**

* No specific branding has been defined at this stage. A clean, professional default theme will be used.

#### **Target Device and Platforms**

* **Web Responsive**: The application will be designed primarily for desktop use but will be fully responsive to work on tablets and mobile devices for viewing purposes.

### **4. Technical Assumptions**

#### **Repository Structure: Monorepo**

* **Rationale**: A monorepo (a single repository for both frontend and backend code) is recommended. This approach simplifies dependency management, makes it easier to share code and types between the frontend and backend (crucial for the AI commands and queries), and streamlines the development workflow.

#### **Service Architecture: Serverless Functions within a Monolith**

* **Rationale**: For the MVP, we'll treat the application as a logical monolith. This means the frontend and backend are tightly coupled and deployed together, which is simpler and faster for an initial build. Using a serverless functions-based approach (e.g., on a platform like Vercel or AWS Lambda) allows for automatic scaling and easy separation into true microservices later, providing the best of both worlds.

#### **Testing Requirements: Unit + Integration Tests**

* **Rationale**: Our testing strategy will require both unit tests (to verify individual pieces of code) and integration tests (to verify that those pieces work together correctly). This provides a strong baseline of quality and confidence for the MVP without the higher overhead of a full end-to-end testing suite, which can be added later.

### **5. \[cite\_start]Epic List** \[cite: 459]

1. **Epic 1: Project Foundation & Intelligent Chart Creation**
   * \[cite\_start]**Goal:** To establish the core application infrastructure and deliver the primary chart creation feature, allowing users to generate a complete org chart by importing a data file. \[cite: 460]

2. **Epic 2: Interactive Chart Management & AI Updates**
   * \[cite\_start]**Goal:** To empower users to easily maintain their org charts through both a visual drag-and-drop editor and fast, AI-powered text commands. \[cite: 460]

### **6. Epic 1 Details: Project Foundation & Intelligent Chart Creation**

\[cite\_start]**Goal:** To establish the core application infrastructure and deliver the primary chart creation feature, allowing users to generate a complete org chart by importing a data file. \[cite: 470]

**Story 1.1: Initial Project Setup**

* \[cite\_start]**As a** Developer, **I want** a new monorepo project initialized with the chosen tech stack, **so that** I can begin building the application on a solid foundation. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. A monorepo is created with the correct folder structure (`apps/web`, `apps/api`).
    2. Frontend and backend applications are scaffolded with basic "Hello World" functionality.
    3. Core dependencies are installed and the project runs locally without errors.

**Story 1.2: Basic UI Shell and Chart Viewer**

* \[cite\_start]**As a** User, **I want** a basic application shell with a placeholder area for the org chart, **so that** I can see where the generated chart will be displayed. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. The main application page renders with a simple header and a primary content area.
    2. The content area contains a placeholder element for the future chart.
    3. An "Import Data" button is visible and clickable on the page.

**Story 1.3: Implement File Upload Capability**

* \[cite\_start]**As a** User, **I want** to be able to select and upload a data file, **so that** the system can process it. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. Clicking the "Import Data" button opens the operating system's file selection dialog.
    2. A user can select a valid file type (e.g., CSV, XLSX).
    3. The selected file is successfully transmitted to a backend API endpoint.

**Story 1.4: AI-Powered Data Parsing**

* \[cite\_start]**As a** User, **I want** the system to intelligently parse my uploaded file and generate a hierarchical structure, **so that** an org chart can be created automatically. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. The backend service processes the uploaded file.
    2. The AI logic correctly identifies columns for employee names and their managers.
    3. The service returns a structured JSON object representing the organizational hierarchy.

**Story 1.5: Display Generated Chart**

* \[cite\_start]**As a** User, **I want** to see the automatically generated org chart displayed on the screen, **so that** I can verify its accuracy. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. The frontend receives the hierarchy JSON from the backend after a successful upload.
    2. The chart viewer component updates to display the org chart based on the received data.
    3. The chart is rendered correctly, showing all employees and their reporting lines.

### **7. Epic 2 Details: Interactive Chart Management & AI Updates**

\[cite\_start]**Goal:** To empower users to easily maintain their org charts through both a visual drag-and-drop editor and fast, AI-powered text commands. \[cite: 470]

**Story 2.1: Enable Drag-and-Drop Interaction**

* \[cite\_start]**As a** User, **I want** to be able to click and drag an employee's card and drop it onto a new manager's card, **so that** I can visually change who they report to. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. Employee cards in the chart are selectable and draggable.
    2. When a card is dropped onto another card, a frontend event is triggered containing the IDs of the employee and the new manager.
    3. The interface prevents a user from dropping an employee onto one of their own direct or indirect reports (to prevent a circular reporting loop).

**Story 2.2: Implement Backend for Hierarchy Updates**

* \[cite\_start]**As a** Developer, **I want** a secure backend endpoint that updates an employee's manager, **so that** changes from the visual editor can be saved to the database. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. A new API endpoint (e.g., `POST /api/chart/update-manager`) is created.
    2. The endpoint accepts the employee's ID and their new manager's ID.
    3. The backend logic validates the change and persists it in the data store.
    4. The endpoint returns a confirmation of success or a descriptive error message.

**Story 2.3: Persist Drag-and-Drop Changes**

* \[cite\_start]**As a** User, **I want** my drag-and-drop changes to be saved automatically, **so that** the org chart is permanently updated. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. After a successful drag-and-drop action, the frontend calls the hierarchy update endpoint.
    2. A saving/loading indicator is displayed while the request is in progress.
    3. Upon a successful response, the chart visually updates to reflect the new structure.
    4. If the save operation fails, an error message is displayed to the user.

**Story 2.4: AI Command Bar Interface**

* \[cite\_start]**As a** User, **I want** a text input field where I can type commands, **so that** I can make changes quickly using natural language. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. A text input field and a "Submit" button are present in the UI.
    2. Entering text and clicking "Submit" sends the command to a new backend endpoint for processing.

**Story 2.5: AI Command Processing Service**

* \[cite\_start]**As a** Developer, **I want** a backend service that interprets natural language commands to modify the chart, **so that** users can manage the chart conversationally. \[cite: 476]
  * \[cite\_start]**Acceptance Criteria:** \[cite: 478]
    1. A new API endpoint (e.g., `POST /api/chart/command`) is created to receive the text command.
    2. The AI service correctly identifies the user's intent (e.g., "change manager," "add employee").
    3. The service extracts relevant entities (e.g., employee names).
    4. The service executes the correct action and persists the change.
    5. The updated chart data is returned to the frontend.
