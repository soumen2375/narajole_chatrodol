# Worldclass - নাড়াজোল ছাত্রদল

A modern, responsive web application built with Angular and Tailwind CSS for the Narajole Chatrodol organization.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Usage](#usage)
- [Project Components](#project-components)
- [Services](#services)
- [Environment Setup](#environment-setup)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**Worldclass** is a comprehensive web application designed for the Narajole Chatrodol organization. It provides information about programs, events, donations, volunteer opportunities, and an admin dashboard for content management.

**Organization:** Narajole Chatrodol  
**Website:** [Live Demo](https://narajole-chatrodol.netlify.app/)  
**Repository:** [GitHub](https://github.com/soumen2375/narajole_chatrodol)  
**Status:** ✅ Active Development

## ✨ Features

### Public Features
- **Home Page**: Landing page with organization overview
- **About Section**: Information about the organization's mission and values
- **Programs**: Display of various programs offered
- **Events**: Calendar and listing of upcoming events
- **Gallery**: Photo gallery showcasing activities and programs
- **Volunteer**: Volunteer registration and opportunity information
- **Donate**: Donation portal for supporters
- **Contact**: Contact form for inquiries
- **Impacts**: Showcase of organizational impacts and achievements

### Admin Features
- **Admin Dashboard**: Centralized management interface
- **Post Management**: Create, edit, and delete posts
- **User Management**: Manage user accounts and roles
- **Settings**: Configure application settings
- **Content Management**: Easy content updates

### Technical Features
- ✅ Responsive Design (Mobile, Tablet, Desktop)
- ✅ Server-Side Rendering Ready
- ✅ SEO Optimized
- ✅ Fast Performance with Lazy Loading
- ✅ Accessible (A11y compliant)
- ✅ Security Headers

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Angular 21](https://angular.io/) - Modern web framework
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Reactive Programming**: [RxJS 7.8.2](https://rxjs.dev/) - Reactive extensions
- **Build Tool**: [Vite 6.2.0](https://vitejs.dev/) - Fast module bundler
- **Fonts**: Google Fonts (Roboto, Noto Sans Bengali)

### Development Tools
- **Package Manager**: npm
- **Node Version**: 18+ (recommended)
- **Development Server**: Angular CLI

### Deployment
- **Hosting**: [Netlify](https://www.netlify.com/)
- **CI/CD**: Netlify Continuous Deployment
- **Repository**: GitHub

## 📁 Project Structure

```
wordclass2/
├── src/
│   ├── app.component.html          # Root component template
│   ├── app.component.ts            # Root component logic
│   ├── app.routes.ts               # Main routing configuration
│   │
│   ├── components/
│   │   ├── about/                  # About section
│   │   │   ├── about.component.html
│   │   │   └── about.component.ts
│   │   │
│   │   ├── admin/                  # Admin dashboard
│   │   │   ├── admin-dashboard.component.html
│   │   │   ├── admin-dashboard.component.ts
│   │   │   ├── admin.routes.ts
│   │   │   ├── post-form/          # Post creation/editing
│   │   │   ├── post-list/          # Post listing
│   │   │   ├── settings/           # Admin settings
│   │   │   └── user-management/    # User management
│   │   │
│   │   ├── contact/                # Contact form
│   │   ├── donate/                 # Donation page
│   │   ├── events/                 # Events listing
│   │   ├── footer/                 # Footer component
│   │   ├── gallery/                # Photo gallery
│   │   ├── header/                 # Header/Navigation
│   │   ├── home/                   # Home page
│   │   ├── impacts/                # Impacts showcase
│   │   ├── programs/               # Programs listing
│   │   └── volunteer/              # Volunteer section
│   │
│   ├── services/
│   │   └── content.service.ts      # Content API service
│   │
│   ├── pipes/
│   │   └── safe-url.pipe.ts        # Safe URL sanitization pipe
│   │
│   └── app.routes.ts               # Application routes
│
├── index.html                      # HTML entry point
├── index.tsx                       # TypeScript entry point
├── index.css                       # Global styles
├── angular.json                    # Angular CLI configuration
├── tsconfig.json                   # TypeScript configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── vite.config.ts                  # Vite configuration
├── netlify.toml                    # Netlify deployment config
├── favicon.png                     # Website favicon
├── package.json                    # Dependencies & scripts
├── package-lock.json               # Dependency lock file
└── README.md                       # This file
```

## 🚀 Installation

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: Latest version

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/soumen2375/narajole_chatrodol.git
   cd wordclass2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify installation**
   ```bash
   npm --version
   node --version
   ```

## 💻 Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000/`

**Features:**
- ✅ Hot Module Replacement (HMR)
- ✅ Live reloading on file changes
- ✅ Development with source maps
- ✅ Fast refresh

### Development Workflow

1. Create feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test locally

3. Commit changes
   ```bash
   git add .
   git commit -m "feat: describe your changes"
   ```

4. Push to repository
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create Pull Request on GitHub

## 🏗️ Build & Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

**Build optimizations:**
- ✅ Minification
- ✅ Tree shaking
- ✅ Code splitting
- ✅ Asset optimization

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally for testing.

### Deploy to Netlify

#### Automatic Deployment (Connected Repository)
- Push changes to `main` branch
- Netlify automatically triggers build
- Deployment happens within minutes
- View status at [Netlify Dashboard](https://app.netlify.com/)

#### Manual Deployment
```bash
npm run build
# Upload dist folder to Netlify or use Netlify CLI
netlify deploy --prod --dir=dist
```

**Deployment Configuration:**
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Environment:** Production

## 📖 Usage

### Running the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm run preview
```

### Available Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Home | Landing page |
| `/about` | About | Organization info |
| `/programs` | Programs | Program listings |
| `/events` | Events | Event calendar |
| `/gallery` | Gallery | Photo gallery |
| `/volunteer` | Volunteer | Volunteer signup |
| `/donate` | Donate | Donation portal |
| `/contact` | Contact | Contact form |
| `/impacts` | Impacts | Impact showcase |
| `/admin` | Admin Dashboard | Admin panel (protected) |

### Navigation

Use the header component for primary navigation. The footer provides secondary links and information.

## 🧩 Project Components

### Page Components
- **Home** (`home/`): Landing page with hero section
- **About** (`about/`): Organization mission and values
- **Programs** (`programs/`): Active programs listing
- **Events** (`events/`): Upcoming events
- **Gallery** (`gallery/`): Photo gallery
- **Volunteer** (`volunteer/`): Volunteer opportunities
- **Donate** (`donate/`): Donation interface
- **Contact** (`contact/`): Contact form
- **Impacts** (`impacts/`): Organization impact metrics

### Layout Components
- **Header** (`header/`): Navigation bar
- **Footer** (`footer/`): Footer section

### Admin Components
- **Admin Dashboard** (`admin/admin-dashboard.component.ts`): Main admin interface
- **Post Form** (`admin/post-form/`): Create/edit posts
- **Post List** (`admin/post-list/`): View all posts
- **User Management** (`admin/user-management/`): Manage users
- **Settings** (`admin/settings/`): Admin settings

## 🔧 Services

### Content Service (`services/content.service.ts`)

Handles API calls and data management:

```typescript
// Example usage
constructor(private contentService: ContentService) {}

// Get all posts
this.contentService.getPosts().subscribe(posts => {
  console.log(posts);
});

// Create new post
this.contentService.createPost(postData).subscribe(response => {
  console.log('Post created');
});
```

## 🔐 Environment Setup

### Environment Variables

Create `.env.local` file in root directory:

```env
# API Configuration
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-api-key

# Application Configuration
VITE_APP_NAME=Worldclass
VITE_APP_VERSION=0.0.0
```

### Configuration Files

1. **angular.json** - Angular CLI settings
2. **tsconfig.json** - TypeScript compiler options
3. **tailwind.config.js** - Tailwind CSS customization
4. **vite.config.ts** - Vite bundler configuration
5. **netlify.toml** - Netlify deployment settings

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Use TypeScript for all new code
- Follow Angular style guide
- Write meaningful commit messages
- Test changes before submitting PR
- Keep components modular and reusable

## 📝 License

This project is private and owned by Narajole Chatrodol organization.

---

## 📞 Support

For questions or issues:
- 📧 Email: contact@example.com
- 🐛 GitHub Issues: [Report Bug](https://github.com/soumen2375/narajole_chatrodol/issues)
- 💬 Discussions: [Join Discussion](https://github.com/soumen2375/narajole_chatrodol/discussions)

## 🔗 Useful Links

- [Angular Documentation](https://angular.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [RxJS Documentation](https://rxjs.dev/)
- [Netlify Docs](https://docs.netlify.com/)

---

**Last Updated:** December 2, 2025  
**Repository:** [narajole_chatrodol](https://github.com/soumen2375/narajole_chatrodol)  
**Maintained by:** Narajole Chatrodol Team
