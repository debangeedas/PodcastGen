# PodcastGen - AI Podcast Generator

## Overview
PodcastGen is a mobile app that creates podcasts from search queries. Users enter a topic they want to learn about, and the app uses AI (OpenAI GPT-4 and TTS) to generate engaging podcast content. Features a conversational AI interface that asks clarifying questions before generating, and supports both single focused episodes and multi-episode series for broader topics.

## Tech Stack
- **Framework**: Expo (React Native)
- **Navigation**: React Navigation 7 with bottom tabs
- **Storage**: AsyncStorage for local data persistence
- **Audio**: expo-av for audio playback
- **AI Integration**: OpenAI API (GPT-4 for script generation, TTS for audio)
- **Authentication**: expo-apple-authentication for Apple Sign-In (iOS)

## Project Structure
```
├── App.tsx                 # Root component with navigation + AuthProvider + AudioPlayerProvider + MiniPlayer
├── contexts/
│   ├── AudioPlayerContext.tsx  # Global audio playback state management
│   └── AuthContext.tsx         # Authentication state with Apple Sign-In
├── navigation/
│   ├── MainTabNavigator.tsx    # 4-tab navigation (Library, Create, Play, Profile)
│   ├── LibraryStackNavigator.tsx
│   ├── CreateStackNavigator.tsx
│   ├── PlayStackNavigator.tsx  # New - Play tab navigator
│   └── ProfileStackNavigator.tsx
├── screens/
│   ├── CreateScreen.tsx        # Podcast creation entry point
│   ├── ChatCreationScreen.tsx  # Conversational AI for refining topic
│   ├── GeneratingScreen.tsx    # Progress modal during generation
│   ├── LibraryScreen.tsx       # Saved podcasts and series list
│   ├── PlayerScreen.tsx        # Legacy player (used within stacks)
│   ├── PlayScreen.tsx          # New - Main player in Play tab
│   ├── SeriesDetailScreen.tsx  # Series episodes viewer
│   └── ProfileScreen.tsx       # User settings
├── components/
│   ├── AnimatedWaveform.tsx    # Animated audio visualization
│   ├── WaveformPreview.tsx     # Static waveform for library cards
│   ├── MiniPlayer.tsx          # Persistent play bar at bottom
│   ├── LoginPrompt.tsx         # Authentication modal for sign-in
│   ├── Button.tsx              # Primary action button
│   ├── Card.tsx                # Elevated card component
│   └── ...
├── utils/
│   ├── storage.ts              # AsyncStorage utilities (podcasts + series)
│   ├── podcastGenerator.ts     # OpenAI integration + series generation
│   └── conversationFlow.ts     # Chat state machine + AI follow-ups
└── constants/
    └── theme.ts                # Design system colors/spacing
```

## Key Features
1. **Authentication**: Apple Sign-In (iOS), Google Sign-In, and Email/Password (all platforms)
2. **Conversational AI Interface**: Chat-based creation with follow-up questions to refine topic scope, depth, and style
3. **Single Episode Mode**: Create a focused episode on a specific topic
4. **Series Mode**: Generate multi-episode series (3-5 episodes) for broader topics
5. **Episode Plan Approval**: For series, review and approve episode titles before generation
6. **AI Script Generation**: Uses GPT-4 to create engaging podcast scripts
7. **Text-to-Speech**: Converts scripts to natural audio using OpenAI TTS
8. **Audio Player**: Full playback with time-synced scrolling lyrics
9. **Source Transparency**: "See Sources" modal shows research citations
10. **Library Management**: Separate views for series and standalone episodes
11. **Voice Selection**: 6 narrator options (onyx, alloy, echo, fable, nova, shimmer)
12. **Favorites**: Mark podcasts and series as favorites

## Data Model
### Podcast (single episode or series episode)
- id, topic, script, audioUri, duration, createdAt, sources
- seriesId (if part of series), episodeNumber, episodeTitle
- isFavorite, voiceUsed, category, style, depth

### PodcastSeries
- id, topic, description, episodeCount, totalDuration
- createdAt, coverColor, isFavorite, style, depth

## Environment Variables
- `EXPO_PUBLIC_OPENAI_API_KEY`: Required for AI features (script + audio generation)

## Test Mode
Set `TEST_MODE = true` in `utils/podcastGenerator.ts` to avoid API calls during development. Uses hardcoded scripts and dummy audio.

## Design System
- **Primary Color**: #6B4CE6 (Deep purple)
- **Secondary Color**: #FF6B6B (Coral)
- **Style**: iOS 26 liquid glass-inspired with clean, modern aesthetics

## Running the App
```bash
npm run dev
```
- Scan QR code with Expo Go app on mobile
- Or access web version at http://localhost:8081

## Recent Changes
- Enhanced authentication with multiple sign-in options:
  - Apple Sign-In (iOS only)
  - Google Sign-In (all platforms)
  - Email/Password sign-up and sign-in (all platforms)
- Login prompt redesigned with sign-in/sign-up toggle for email auth
- Profile screen shows auth method used (Apple, Google, Email)
- AuthContext manages global auth state with AsyncStorage persistence
- Email accounts stored locally with basic validation
- Added "Play" tab with persistent mini player bar across all screens (like Spotify)
- Mini player hides on Play screen, reappears when pressing play
- AudioPlayerContext provides global playback state management
- After podcast generation, automatically navigates to Play tab and starts playing
- Library and Series screens now use global audio player for seamless playback
- Unified conversation flow for both single episodes and series
- AI asks 3 questions: format preference, depth, and style
- Choosing "Single episode" creates one focused episode
- Choosing "Multi-part series" triggers series flow with episode plan approval
- Quick-reply chips for fast topic refinement

## Notes
- Email/password authentication stores accounts locally for demo purposes
- For production, integrate with a backend auth service like Firebase
- Google Sign-In requires OAuth client IDs from Google Cloud Console
