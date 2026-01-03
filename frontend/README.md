# WorkZen HRMS - React Frontend

Modern React-based landing page for WorkZen HRMS with dark theme and smooth animations.

## 🚀 Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **GSAP** - Advanced animations
- **Chart.js** - Data visualization
- **Lucide React** - Icon library

## 📁 Project Structure

```
frontend-react/
├── public/
│   └── assets/          # Images, logos, icons
├── src/
│   ├── pages/
│   │   ├── LandingPage.js   # Single-file landing page (14 sections)
│   │   ├── About.js         # About page
│   │   ├── Pricing.js       # Pricing page
│   │   └── Contact.js       # Contact page
│   ├── styles/
│   │   └── index.css        # Global styles + Tailwind
│   ├── App.js               # React Router configuration
│   └── index.js             # React entry point
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🎨 Landing Page Sections

The **LandingPage.js** file contains all 14 sections in a single component:

1. **Hero** - Main headline with CTA
2. **Built for Your People** - Core features grid
3. **HRMS in Your Pocket** - Mobile app showcase
4. **Make the Shift** - CTA section
5. **HR Software That Grows** - Scalability tiers
6. **Integrations** - Third-party integrations
7. **Employee Engagement** - Engagement features
8. **HR Analytics** - Analytics dashboard
9. **Integrated Payroll** - Payroll management
10. **Hiring & Onboarding** - Recruitment features
11. **Compensation & Learning** - L&D features
12. **Core HR Management** - Core HR functions
13. **FAQ** - Frequently asked questions
14. **Awards & Footer** - Recognition and footer

## 🏃 Local Development

### Prerequisites

- Node.js 16+ and npm 8+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Navigate to frontend directory
cd frontend-react

# Install dependencies
npm install
```

### Development Server

```bash
# Start Vite dev server
npm run dev
```

The app will be available at **http://localhost:3000**

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

## 🔐 Authentication

WorkZen HRMS includes role-based authentication with three distinct dashboards:

### Signup (`/signup`)
- **Allowed Roles**: Employee, HR Officer, Payroll Officer
- **Admin Role**: Cannot sign up via UI (seeded by system only)
- After successful signup, user is redirected to login page

### Login (`/login`)
- Authenticates via `POST /api/auth/login`
- Stores `workzen_token`, `workzen_role`, `workzen_user` in localStorage
- **Role-Based Redirect**:
  - Employee → `/dashboard/employee`
  - HR Officer → `/dashboard/hr`
  - Payroll Officer → `/dashboard/payroll`
  - Admin → `/dashboard/employee` (fallback)

### Role-Specific Dashboards

**Employee Dashboard** (`/dashboard/employee`):
- Punch In/Out attendance
- Monthly attendance chart (Chart.js)
- Leave requests and balance
- Download payslips

**HR Officer Dashboard** (`/dashboard/hr`):
- Approve/reject leave requests
- Review attendance corrections
- Employee directory management
- Leave allocation

**Payroll Officer Dashboard** (`/dashboard/payroll`):
- Run monthly payroll
- View locked payruns
- Generate payslips in bulk
- Monthly payroll cost analytics
- Approved leaves summary

### Test Credentials
```
Employee:        employee1@workzen.com / emp123
HR Officer:      hr1@workzen.com / hr123
Payroll Officer: payroll1@workzen.com / pay123
Admin:           admin@workzen.com / admin123
```

### Protected Routes
All dashboard routes are protected by the `PrivateRoute` component in `App.jsx`, which:
- Checks for valid authentication token
- Validates user role matches allowed role
- Redirects unauthorized users to login or appropriate dashboard

## 🎯 Features

### Dark Theme
- Modern dark design (#000 background)
- Blue primary color (#005eb8)
- Gold accent color (#f2c744)

### Animations
- Framer Motion for component animations
- GSAP for scroll-based reveals
- Smooth scrolling between sections

### Responsive Design
- Mobile-first approach
- Breakpoints for tablets and desktops
- Touch-friendly UI elements

### Navigation
- Fixed navbar with scroll effects
- Smooth scroll to sections
- Mobile hamburger menu
- React Router for multi-page navigation

## 🔧 Customization

### Colors

Edit `tailwind.config.js` to change the color palette:

```javascript
colors: {
  primary: {
    DEFAULT: '#005eb8',
    // ... other shades
  },
}
```

### Sections

All sections are in `src/pages/LandingPage.js`. Each section is clearly marked with JSX comments:

```javascript
{/* ==================== SECTION 1: HERO ==================== */}
<section id="hero">
  ...
</section>
```

### Add New Pages

1. Create a new file in `src/pages/`
2. Add route in `src/App.js`:

```javascript
<Route path="/new-page" element={<NewPage />} />
```

## 📦 Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "framer-motion": "^11.5.4",
  "gsap": "^3.12.5",
  "chart.js": "^4.4.4",
  "lucide-react": "^0.445.0"
}
```

## 🌐 API Integration

The frontend is configured to proxy API requests to the backend:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

## 📝 Notes

- **Single-file Landing Page**: All 14 sections in one component for simplicity
- **No TypeScript**: Pure JavaScript for easier maintenance
- **No Component Splitting**: Intentionally kept as one file per requirement
- **Local-first**: Optimized for local development

## 🚀 Deployment

For production deployment:

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting service
3. Configure environment variables for API URL

## 📄 License

This project is part of WorkZen HRMS. See main LICENSE file.

---

**Built with ❤️ using React + Vite**
