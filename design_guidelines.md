# Podcast Generator App - Design Guidelines

## Architecture

### Authentication
**No authentication required.** This is a utility app with local storage.

**Profile/Settings Screen:**
- Include user-customizable avatar (generate 3 preset podcast-themed avatars: microphone icon style, headphones style, soundwave style)
- Display name field for personalization
- App preferences:
  - Audio quality settings (Standard, High, Premium)
  - Auto-save generated podcasts toggle
  - Theme toggle (Light/Dark)

### Navigation Structure
**Tab Navigation (3 tabs):**
1. **Library** (Left) - Browse saved podcasts
2. **Create** (Center) - Main podcast generation interface
3. **Profile** (Right) - Settings and user preferences

**Modal Screens:**
- Podcast Player (full-screen modal with dismiss gesture)
- Generation Progress (modal overlay during podcast creation)

## Screen Specifications

### 1. Create Screen (Home/Center Tab)
**Purpose:** Search for topics and initiate podcast generation

**Layout:**
- **Header:** Transparent, no navigation buttons, title "Create Podcast"
- **Root View:** Scrollable with safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Main Content:**
  - Large search input with placeholder "What would you like to learn about?"
  - Search button below input (primary action button)
  - Optional: Quick topic suggestions as chips below search
  - Recent searches list (if any exist)

**Components:**
- Search input field (multiline, up to 3 lines)
- Primary CTA button ("Generate Podcast")
- Topic suggestion chips (optional quick starts)
- List of recent searches with delete swipe action

### 2. Library Screen (Left Tab)
**Purpose:** Browse and manage saved podcasts

**Layout:**
- **Header:** Default with title "My Podcasts", right button (sort/filter icon)
- **Root View:** List view with safe area insets: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Main Content:**
  - List of generated podcasts with metadata
  - Empty state if no podcasts saved

**Components:**
- Podcast cards showing:
  - Topic/title (bold)
  - Duration (e.g., "8 min")
  - Date created
  - Waveform thumbnail or audio visualization
  - Play button overlay
- Swipe actions: Delete, Share
- Empty state illustration with message "No podcasts yet. Create your first one!"

### 3. Profile Screen (Right Tab)
**Purpose:** User settings and app preferences

**Layout:**
- **Header:** Default with title "Profile"
- **Root View:** Scrollable form with safe area insets: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Main Content:**
  - Avatar selector at top
  - Display name field
  - Grouped settings sections

**Components:**
- Avatar picker (3 preset options)
- Text input for display name
- Grouped settings list:
  - Audio Quality (dropdown/selector)
  - Auto-save (toggle)
  - Theme (toggle)
  - About section (app version, privacy policy, terms)

### 4. Podcast Player (Modal Screen)
**Purpose:** Playback of generated podcast

**Layout:**
- **Header:** Transparent with close button (top-left X icon)
- **Root View:** Non-scrollable with safe area insets: top = insets.top + Spacing.xl, bottom = insets.bottom + Spacing.xl
- **Main Content:**
  - Large waveform visualization (animated during playback)
  - Podcast topic/title
  - Audio controls (large play/pause button, skip 15s back/forward)
  - Progress slider with time labels
  - Bottom actions: Share, Download, Delete

**Components:**
- Animated audio waveform (center)
- Large circular play/pause button
- Skip controls (15s back/forward icons)
- Progress slider with current time / total duration
- Action buttons (icon buttons with labels)

### 5. Generation Progress (Modal Overlay)
**Purpose:** Show podcast creation progress

**Layout:**
- **Semi-transparent overlay** covering entire screen
- **Card in center** with safe area awareness
- **Non-dismissible** until complete or error

**Components:**
- Loading spinner or progress indicator
- Stage indicators:
  1. "Searching credible sources..."
  2. "Analyzing information..."
  3. "Generating script..."
  4. "Creating audio..."
- Estimated time remaining
- Cancel button (with confirmation alert)

## Design System

### Color Palette
**Primary:** Deep purple (#6B4CE6) - represents audio/creativity
**Secondary:** Vibrant coral (#FF6B6B) - for accents and CTAs
**Background (Light):** Off-white (#F8F9FA)
**Background (Dark):** Rich dark (#1A1A2E)
**Surface:** White (#FFFFFF) in light mode, Dark surface (#25253C) in dark mode
**Text Primary:** Near-black (#1F1F1F) in light, Off-white (#F5F5F5) in dark
**Text Secondary:** Medium gray (#6C757D)
**Success:** Green (#51CF66) - for completed generations
**Error:** Red (#FF6B6B) - for failed operations

### Typography
**Headings:**
- H1: 28pt, Bold, Primary text color
- H2: 22pt, Semibold, Primary text color
- H3: 18pt, Semibold, Primary text color

**Body:**
- Body Large: 16pt, Regular, Primary text color
- Body: 14pt, Regular, Primary text color
- Caption: 12pt, Regular, Secondary text color

**Special:**
- Podcast titles: 18pt, Bold
- Time/duration: 14pt, Monospace

### Visual Design

**Icons:** Use Feather icons from @expo/vector-icons
- Navigation: 24pt
- Action buttons: 20pt
- List items: 18pt

**Touchable Feedback:**
- All buttons: Opacity reduction to 0.7 on press
- List items: Light background highlight on press
- Floating action button (Generate Podcast): Subtle shadow
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2

**Audio Waveform:**
- Use animated bars or line visualization
- Primary color with opacity variation
- Animate during playback
- Static preview in library cards

**Cards (Library):**
- Border radius: 12pt
- Light shadow in light mode (shadowOpacity: 0.05)
- Subtle border in dark mode
- Padding: 16pt
- Spacing between cards: 12pt

**Buttons:**
- Primary (Generate): Rounded (100pt radius), full-width, 50pt height, bold text
- Secondary: Outlined, same dimensions
- Icon buttons: 44x44pt tap target

### Critical Assets
1. **3 Podcast-themed avatars:**
   - Avatar 1: Minimalist microphone icon in circular badge
   - Avatar 2: Stylized headphones icon in circular badge
   - Avatar 3: Abstract soundwave pattern in circular badge
   - All avatars: 80x80pt, matching app color palette

2. **Empty state illustration:**
   - Simple illustration of microphone or podcast icon
   - Matching brand colors
   - 200x200pt maximum size

3. **App icon elements:**
   - Should incorporate microphone or soundwave motif
   - Use primary purple and coral accent

### Accessibility
- Minimum tap target size: 44x44pt
- Color contrast ratio: 4.5:1 minimum for text
- Audio controls: Extra-large tap targets (60x60pt for play/pause)
- VoiceOver labels for all interactive elements
- Progress indicators announce status changes
- Support Dynamic Type for text scaling

### Interaction Design
- Search input focuses automatically when Create tab is selected
- Pull-to-refresh on Library screen to sync local storage
- Swipe gestures for delete/share actions on podcast cards
- Long-press on podcast card shows context menu (Play, Share, Delete)
- Haptic feedback on button presses and successful generation
- Smooth transitions between screens (300ms duration)
- Progress modal dismisses automatically on completion with success animation