Of course. Here is a comprehensive PRD for your real-time bus tracking app, integrating the specified minimal, bold color palette and clean UI/UX inspired by Google Maps and Ola.

### **Product Requirements Document (PRD): Real-Time Bus Tracker**

**1. Vision & Goal**

* **Vision:** To provide a simple, reliable, and accessible real-time bus tracking service for commuters in tier-2 cities.
* **Goal:** To create a lightweight, intuitive mobile application that allows users to track buses live, check ETAs, and receive timely alerts, reducing travel anxiety and wait times.

***

**2. Design System & Philosophy**

Our design philosophy is rooted in **simplicity and accessibility**. The interface must be immediately understandable for a diverse user base, prioritizing function over flair. It is optimized for low-bandwidth environments.

#### **2.1. Color Palette**

The UI is built on a strict, high-contrast three-color system.

| Role | Token Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | `$color-background-base` | `#FFFFFF` | App background, cards, modals, input fields. |
| **Text & Icons** | `$color-text-primary` | `#000000` | All text, icons, map route lines, dividers. |
| **Accent & CTA** | `$color-accent-primary` | `#FF6F00` | All buttons, highlights, active states, focus rings, live bus icons. |

*Note: A functional exception is made for the bus occupancy indicator, which uses universally understood colors for status.*
* **Low Occupancy:** `#28A745` (Green)
* **Medium Occupancy:** `#FFC107` (Yellow)
* **High Occupancy:** `$color-accent-primary` (`#FF6F00`) (Orange)

#### **2.2. Typography & Iconography**

* **Font:** **Poppins** or **Inter** – A clean, legible sans-serif font that supports English, Hindi, and Marathi.
* **Iconography:** **Material Symbols (Outlined)** – A lightweight and universally recognized icon set. Icons will use `$color-text-primary`.

#### **2.3. Core Components**

* **Primary Button:** Rounded corners (`12px`), solid `$color-accent-primary` background, and bold `$color-background-base` text.
* **Text Input:** `$color-background-base` fill with a `1px` `$color-text-primary` border. The border turns `$color-accent-primary` when the field is active/focused.

***

**3. Screens & User Flow**

#### **3.1. Onboarding / Welcome Screen 🙋‍♂️**
* **Objective:** To provide a clean and welcoming first impression of the app.
* **Key Elements:**
    1.  **App Logo:** A simple bus icon or logomark using `$color-text-primary` with a single, impactful accent in `$color-accent-primary`.
    2.  **Tagline:** "Track Buses in Real-Time" in bold `$color-text-primary`.
    3.  **CTA Button:** A "Get Started" button using the defined Primary Button style.


#### **3.2. Login / Signup Screen 📱**
* **Objective:** To offer a frictionless entry into the app.
* **Key Elements:**
    1.  **Phone Number Input:** A prominent text input field for the user's mobile number.
    2.  **Continue Button:** A Primary Button to submit the number and request an OTP.
    3.  **Guest Option:** A plain text link (`$color-text-primary` with an underline) stating "Continue as Guest" for users who want to explore the app without signing up.

#### **3.3. Home / Live Map Screen 🗺️**
* **Objective:** To provide an immediate, at-a-glance view of live bus locations and nearby stops.
* **Key Elements:**
    1.  **Map View:** Full-screen map using a minimal style. The background is `$color-background-base` with light grey roads.
    2.  **Live Bus Icons:** Moving bus icons displayed in `$color-accent-primary` for high visibility.
    3.  **Bus Stop Markers:** Simple circular markers in `$color-text-primary`.
    4.  **Floating Search Bar:** A search bar at the top of the screen with a `$color-background-base` fill and a `1px` `$color-accent-primary` outline to draw attention.

#### **3.4. Bus Details Screen 🚌**
* **Objective:** To provide detailed information about a selected bus in an accessible bottom sheet.
* **Key Elements:**
    1.  **Bottom Sheet:** When a bus is tapped on the map, a card slides up from the bottom.
    2.  **Key Info:** Displays Bus Number, ETA, and current location text in `$color-text-primary`. The ETA value itself is highlighted in `$color-accent-primary`.
    3.  **Occupancy Indicator:** A simple bar or lozenge showing "Low," "Medium," or "High" with the corresponding status color (Green/Yellow/Orange).
    4.  **Stop List:** A vertical list of the next few stops.
    5.  **CTA Button:** A "Set Alert" Primary Button.

#### **3.5. Search Routes Screen 🔍**
* **Objective:** To allow users to easily find bus routes.
* **Key Elements:**
    1.  **Search Input:** A prominent search bar at the top to search by route number, source, or destination.
    2.  **Results List:** Search results appear as a clean list below. Each item is a card showing the bus number and its final destination.
    3.  **ETA Highlight:** The ETA for each suggested bus is shown in `$color-accent-primary`.

#### **3.6. Notifications / Alerts Screen 🔔**
* **Objective:** To provide a centralized place for all user-critical alerts.
* **Key Elements:**
    1.  **Alert List:** A chronological list of notifications (e.g., "Bus 101 is 5 minutes away," "Route 45 is delayed").
    2.  **Active State:** Unread or currently active alerts have a vertical bar on the left side in `$color-accent-primary`.

#### **3.7. Profile & Settings Screen ⚙️**
* **Objective:** To allow users to manage their account, preferences, and saved items.
* **Key Elements:**
    1.  **User Profile:** A simple section at the top with the user's name.
    2.  **Settings List:** A clean list of options:
        * Language Selection (English / हिन्दी / मराठी)
        * Notification Preferences (with toggles for In-app, SMS, WhatsApp)
        * Saved Routes
    3.  **Logout:** A final list item to log out of the account.