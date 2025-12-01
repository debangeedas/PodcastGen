# PodcastGen - AI Podcast Generator

## Overview
PodcastGen is a mobile app that creates podcasts from search queries. Users enter a topic they want to learn about, and the app uses AI (OpenAI GPT-4 and TTS) to generate engaging podcast content. Supports both single focused episodes and multi-episode series for broader topics.

## Tech Stack
- **Framework**: Expo (React Native)
- **Navigation**: React Navigation 7 with bottom tabs
- **Storage**: AsyncStorage for local data persistence
- **Audio**: expo-av for audio playback
- **AI Integration**: OpenAI API (GPT-4 for script generation, TTS for audio)

## Project Structure
```
├── App.tsx                 # Root component with navigation
├── navigation/
│   ├── MainTabNavigator.tsx    # 3-tab navigation (Library, Create, Profile)
│   ├── LibraryStackNavigator.tsx
│   ├── CreateStackNavigator.tsx
│   └── ProfileStackNavigator.tsx
├── screens/
│   ├── CreateScreen.tsx        # Podcast creation with single/series toggle
│   ├── GeneratingScreen.tsx    # Progress modal during generation
│   ├── LibraryScreen.tsx       # Saved podcasts and series list
│   ├── PlayerScreen.tsx        # Audio playback with lyrics
│   ├── SeriesDetailScreen.tsx  # Series episodes viewer
│   └── ProfileScreen.tsx       # User settings
├── components/
│   ├── AnimatedWaveform.tsx    # Animated audio visualization
│   ├── WaveformPreview.tsx     # Static waveform for library cards
│   ├── Button.tsx              # Primary action button
│   ├── Card.tsx                # Elevated card component
│   └── ...
├── utils/
│   ├── storage.ts              # AsyncStorage utilities (podcasts + series)
│   └── podcastGenerator.ts     # OpenAI integration + series generation
└── constants/
    └── theme.ts                # Design system colors/spacing
```

## Key Features
1. **Single Episode Mode**: Create a focused episode on a specific topic
2. **Series Mode**: Generate multi-episode series (3-5 episodes) for broader topics
3. **AI Script Generation**: Uses GPT-4 to create engaging podcast scripts
4. **Text-to-Speech**: Converts scripts to natural audio using OpenAI TTS
5. **Audio Player**: Full playback with time-synced scrolling lyrics
6. **Source Transparency**: "See Sources" modal shows research citations
7. **Library Management**: Separate views for series and standalone episodes
8. **Voice Selection**: 6 narrator options (onyx, alloy, echo, fable, nova, shimmer)
9. **Favorites**: Mark podcasts and series as favorites

## Data Model
### Podcast (single episode or series episode)
- id, topic, script, audioUri, duration, createdAt, sources
- seriesId (if part of series), episodeNumber, episodeTitle
- isFavorite, voiceUsed, category

### PodcastSeries
- id, topic, description, episodeCount, totalDuration
- createdAt, coverColor, isFavorite

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
- Added podcast series support for multi-episode content
- Create screen toggle between single episode and series modes
- Series generation creates 3-5 themed episodes with AI
- Library shows series and episodes in separate sections
- Series detail screen with episode list and "Play All"
- Player screen with time-synced scrolling lyrics
- "See Sources" modal for research transparency
- Fixed retry button on generation failure
