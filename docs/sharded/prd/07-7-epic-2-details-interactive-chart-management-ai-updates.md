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
