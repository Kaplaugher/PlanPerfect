# PlanPerfect

[![Nuxt UI Pro](https://img.shields.io/badge/Made%20with-Nuxt%20UI%20Pro-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com/pro)
[![Deploy to NuxtHub](https://img.shields.io/badge/Deploy%20to-NuxtHub-00DC82?logo=nuxt&labelColor=020420)](https://hub.nuxt.com/new?repo=nuxt-ui-pro/chat)

PlanPerfect is an AI-powered travel planning and journaling application that helps you create, organize, and document your travel experiences. Built with Nuxt and Tailwind CSS, it offers a seamless interface for planning trips and capturing memories.

- [Live demo](#) (Coming soon)
- [Documentation](#) (Coming soon)

<a href="#" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2NoYXQtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3NDI4NDY2ODB9.n4YCsoNz8xatox7UMoYZFNo7iS1mC_DT0h0A9cKRoTw.jpg?theme=dark">
    <source media="(prefers-color-scheme: light)" srcset="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2NoYXQtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3NDI4NDY2ODB9.n4YCsoNz8xatox7UMoYZFNo7iS1mC_DT0h0A9cKRoTw.jpg?theme=light">
    <img alt="PlanPerfect - AI Travel Planning App" src="https://assets.hub.nuxt.com/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJodHRwczovL2NoYXQtdGVtcGxhdGUubnV4dC5kZXYiLCJpYXQiOjE3NDI4NDY2ODB9.n4YCsoNz8xatox7UMoYZFNo7iS1mC_DT0h0A9cKRoTw.jpg">
  </picture>
</a>

## Features

- ✈️ **AI-Powered Trip Planning** - Get personalized travel recommendations and itineraries
- 📝 **Travel Journal** - Document your adventures with rich text and media support
- 🗺️ **Interactive Maps** - Visualize your travel plans and routes
- 🔐 **Secure Authentication** - Keep your travel plans private and secure
- 💾 **Cloud Sync** - Access your plans and journals from anywhere
- 🌙 **Dark/Light Mode** - Comfortable viewing in any environment
- ⌨️ **Keyboard Shortcuts** - Efficient navigation and planning

## Tech Stack

- [Nuxt 3](https://nuxt.com/) - The Vue.js Framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Nuxt UI Pro](https://ui.nuxt.com/pro) - UI Components
- [Workers AI](https://ai.cloudflare.com) - AI Integration
- [NuxtHub](https://hub.nuxt.com) - Backend & Deployment

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/planperfect.git

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Environment Setup

Create a `.env` file in the root directory:

```env
# GitHub OAuth (for authentication)
NUXT_OAUTH_GITHUB_CLIENT_ID=your_client_id
NUXT_OAUTH_GITHUB_CLIENT_SECRET=your_client_secret

# AI Configuration
NUXT_CLOUDFLARE_GATEWAY_ID=your_gateway_id
```

## Development

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

Deploy to Cloudflare:

```bash
npx nuxthub deploy
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
