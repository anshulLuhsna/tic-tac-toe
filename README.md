This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your ElevenLabs API key:

1. Sign up at [ElevenLabs](https://elevenlabs.io/) and get your API key from the profile settings.
2. Create a `.env.local` file in the root of your project (or edit if already created).
3. Add your API key: `ELEVENLABS_API_KEY=your_api_key_here`

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

### Tic-Tac-Toe Game with Voice Interaction

This application demonstrates:
- A playable Tic-Tac-Toe game with voice controls using ElevenLabs conversation API
- Text-to-speech announcements for game results
- Conversational AI interactions

### Text-to-Speech with ElevenLabs

After each game ends, the application uses ElevenLabs TTS to announce the result with a custom message based on whether you won, lost, or tied.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
