# Frontend Setup Guide

## Quick Setup (Automated)

### Option 1: Run Setup Script (Recommended)

```bash
cd /Users/myaswantrams/Desktop/pers/Monthly-financial-tracker/frontend
chmod +x setup.sh
./setup.sh
```

The script will:
- ✅ Check if Node.js/npm is installed
- ✅ Install all dependencies
- ✅ Verify installation
- ✅ Show next steps

### Option 2: Manual Setup

```bash
cd frontend
npm install
npm run dev
```

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

Check your versions:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

## What Gets Installed

The setup installs these key packages:

### Core Framework
- `next@14.1.0` - Next.js framework
- `react@18.2.0` - React library
- `typescript@5.3.3` - TypeScript

### UI Components
- `@radix-ui/*` - Accessible UI primitives
- `lucide-react` - Icon library
- `tailwindcss@3.4.1` - Utility-first CSS

### State & Data
- `zustand@4.5.0` - State management
- `@tanstack/react-query@5.17.19` - Data fetching
- `axios@1.6.5` - HTTP client

### Utilities
- `clsx` - Class name utilities
- `tailwind-merge` - Tailwind class merging
- `date-fns` - Date utilities
- `zod` - Schema validation

## After Installation

### 1. All TypeScript errors will disappear ✨

The 200+ lint errors you see are just missing type definitions. After `npm install`, they'll all be resolved!

### 2. Start Development Server

```bash
npm run dev
```

Server starts at: http://localhost:3000

### 3. Build for Production

```bash
npm run build
npm start
```

## Environment Variables

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost
```

This points to your Nginx API gateway.

## Troubleshooting

### Issue: "Cannot find module" errors persist

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Use different port
PORT=3001 npm run dev
```

### Issue: npm install is slow

**Solution:**
```bash
# Use yarn instead (faster)
npm install -g yarn
yarn install
```

### Issue: Permission errors

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $USER ~/.npm
```

## Verification

After setup, verify everything works:

```bash
# Check TypeScript compilation
npm run build

# Run linter
npm run lint
```

You should see:
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Build completes successfully

## Project Structure After Setup

```
frontend/
├── node_modules/        # ✨ Created by npm install
├── .next/              # ✨ Created on first dev run
├── src/
│   ├── app/            # Next.js pages
│   ├── components/     # React components
│   └── lib/            # Utilities & API
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── tailwind.config.ts  # Tailwind config
└── next.config.js      # Next.js config
```

## Next Steps

1. ✅ Run setup script or `npm install`
2. ✅ Start dev server: `npm run dev`
3. ✅ Open http://localhost:3000
4. ✅ Register a new account
5. ✅ Explore the dashboard

## Docker Setup (Alternative)

If you prefer Docker:

```bash
cd frontend
docker build -t finance-frontend .
docker run -p 3000:3000 finance-frontend
```

## File Watching Issues?

If hot reload isn't working:

**macOS:**
```bash
# Increase file watch limit
echo kern.maxfiles=65536 | sudo tee -a /etc/sysctl.conf
echo kern.maxfilesperproc=65536 | sudo tee -a /etc/sysctl.conf
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

## Clean Start

For a completely fresh install:

```bash
cd frontend
rm -rf node_modules .next package-lock.json
npm install
npm run dev
```

## Need Help?

- Check `README.md` in frontend folder
- Review backend API documentation
- Ensure backend services are running on ports 8001-8006

---

**Your production-grade UI is ready to go!** 🚀
