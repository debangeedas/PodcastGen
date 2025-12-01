# PodcastGen - AI Podcast Generator

## Overview
PodcastGen is a mobile app that creates podcasts from search queries. Users enter a topic they want to learn about, and the app uses AI (OpenAI GPT-4 and TTS) to generate an engaging podcast episode complete with audio playback.

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
│   ├── CreateScreen.tsx        # Main podcast creation interface
│   ├── GeneratingScreen.tsx    # Progress modal during generation
│   ├── LibraryScreen.tsx       # Saved podcasts list
│   ├── PlayerScreen.tsx        # Audio playback with controls
│   └── ProfileScreen.tsx       # User settings
├── components/
│   ├── AnimatedWaveform.tsx    # Animated audio visualization
│   ├── WaveformPreview.tsx     # Static waveform for library cards
│   ├── Button.tsx              # Primary action button
│   ├── Card.tsx                # Elevated card component
│   └── ...
├── utils/
│   ├── storage.ts              # AsyncStorage utilities
│   └── podcastGenerator.ts     # OpenAI integration
└── constants/
    └── theme.ts                # Design system colors/spacing
```

## Key Features
1. **Topic Search**: Enter any topic to generate a podcast
2. **Quick Topics**: Pre-defined topic suggestions for fast starts
3. **AI Script Generation**: Uses GPT-4 to create engaging podcast scripts
4. **Text-to-Speech**: Converts scripts to natural audio using OpenAI TTS
5. **Audio Player**: Full playback controls with skip, progress slider
6. **Library**: Save and manage generated podcasts
7. **Settings**: Avatar selection, audio quality, auto-save preferences

## Environment Variables
- `EXPO_PUBLIC_OPENAI_API_KEY`: Required for AI features (script + audio generation)

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
- Initial MVP implementation with full podcast generation workflow
- 3-tab navigation structure (Library, Create, Profile)
- OpenAI integration for RAG-based content and TTS audio
- Local storage with AsyncStorage
- Animated waveform visualizations
