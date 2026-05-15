# ✨ Veltro ERP & POS - Modern Frontend

Welcome to the **Veltro ERP & POS** frontend repository! This is a state-of-the-art, high-performance, and premium SaaS ERP & Point of Sale interface designed to run flawlessly with modern browsers. 

With sleek typography, a tailored premium SaaS color palette, dynamic micro-animations, and strict type-safety, Veltro provides a modern and engaging user experience for business administration.

---

## 🎨 Design Philosophy & UX Highlights

Veltro's frontend was crafted with an extreme focus on aesthetics, usability, and speed:
*   **Premium SaaS UI**: Styled with curated emerald greens (`#038E57`) and elegant warm background tones (`#FEFAF1`) to create a beautiful, modern look.
*   **Dynamic Visuals**: Polished transitions and smooth micro-animations powered by **Framer Motion** and responsive hover states.
*   **Financial Grade Precision**: Uses `tabular-nums` alignment for all numerical datasets, tables, and financial values.
*   **Responsive Layouts**: Designed to be responsive, wrapping elements elegantly and using structure constraints like `max-w` containers.
*   **Localized Context**: Dynamic language contexts matching technical specifications in English, and user-facing copy optimized in Spanish.

---

## 🚀 Key Modules & Features

The interface is structured into distinct high-performing modules restricted by role authorizations (`ADMIN`, `WAREHOUSE`, `CASHIER`):

*   📊 **Executive Dashboard**: Real-time business intelligence, dynamic metrics cards, and operation overviews.
*   🛒 **Smart Point of Sale (POS)**: An optimized cashier portal featuring ultra-responsive item cart mechanics, instant tax calculations, and ticket management.
*   📦 **Interactive Catalog**: Advanced product management supporting inactive product archives, real-time filtering, and category nesting.
*   🔔 **Inventory Alerts**: Proactive alert monitoring system showing low stock indicators, critical alerts, and resolution actions.
*   🧾 **Purchasing & Suppliers**: Automated purchase order routing, dynamic supply costs estimation, and comprehensive supplier portfolios.
*   🔍 **Audit Trail**: Security compliance log tracking database modifications, session events, and user history (Restricted to `ADMIN`).
*   👥 **User Settings & Worker Management**: Centralized profiles displaying dynamic store statistics (e.g., active employee counts, associated manager name, store email) and administrative team management.

---

## 🛠️ Technology Stack

The project relies on a highly efficient, type-safe, and modern tech stack:

*   **Framework**: [React 18](https://react.dev/) + [Vite](https://vite.dev/) (fast HMR, optimized builds)
*   **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type safety, custom schemas)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Cutting-edge design compiler)
*   **Icons**: [Lucide React](https://lucide.dev/) (Consistent, clean iconography)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) (Micro-interactions, state transitions)
*   **State Management**: [Zustand](https://zustand.docs.pmnd.rs/) (Lightweight, unified client-side state)
*   **Data Fetching**: [TanStack Query v5 (React Query)](https://tanstack.com/query/latest) (Robust caching and remote synchronizations)
*   **Form Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
*   **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro) (Unit and integration tests)

---

## 📂 Project Structure

```bash
src/
├── api/             # API clients, axios interceptors, and endpoint endpoints
├── components/      # Shared layout components, alerts, loaders, and input fields
├── constants/       # Global constants, static data lists, and UI configurations
├── hooks/           # Custom React hooks (e.g. `useAuth`, `useActiveState`)
├── modules/         # Specific complex module engines and calculators
├── pages/           # High-level route views (Dashboard, POS, Catalog, Audit, Settings)
├── stores/          # Zustand global state stores (e.g., `authStore`)
├── test/            # Mock servers (MSW), setups, and test suites
├── types/           # Core TypeScript type definitions (Users, Products, Orders)
└── utils/           # Helper utilities, formateurs, and calculations
```

---

## ⚡ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed.

### Installation

1.  Clone the repository and navigate to the frontend workspace:
    ```bash
    cd FrontendVeltro
    ```
2.  Install all dependencies:
    ```bash
    npm install
    ```

### Development Server

Launch the Vite local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```

The application will be served at `http://localhost:5173`.

### Production Build

Build the project for production:
```bash
npm run build
```
This generates a highly optimized `dist` folder ready for deployment.

### Run Tests

Execute the Vitest test suites:
```bash
npm run test
```

For coverage and GUI modes:
```bash
# Run tests with UI
npm run test:ui

# Generate coverage reports
npm run test:coverage
```

---

## 🔒 Recent Technical Debt Resolutions

We consistently maintain high software standards. Recent enhancements include:
1.  **Unified Auth Hook Propagation**: Cleaned up legacy/direct authentication state manipulation. Replaced manual payload mapping inside `LoginPage` with the standardized custom `useAuth().login(...)` hook, ensuring synchronized user data propagation across `authStore`.
2.  **Resilient Asynchronous Error Handling**: Refactored `ProfilePage` to robustly handle API fetching failures when fetching store worker metrics, displaying user-friendly red warning banners ("Error al cargar") without compromising page stability.
3.  **Strict Linting & Build Rules**: Standardized ESLint and TypeScript compilation workflows to guarantee production-ready builds.
