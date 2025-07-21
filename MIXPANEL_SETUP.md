# Mixpanel Integration Setup Guide

## Overview
This guide will help you set up Mixpanel analytics in your Footy Picker application to track user interactions and gain insights into app usage.

## 1. Get Your Mixpanel Credentials

### Create a Mixpanel Project
1. Go to [Mixpanel.com](https://mixpanel.com) and sign up or log in
2. Create a new project or use an existing one
3. Navigate to your project settings
4. Copy your **Project Token** (you'll need this for the next step)

### Add Token to Environment Variables
1. Open `client/footy-client/.env`
2. Replace `YOUR_MIXPANEL_TOKEN_HERE` with your actual Mixpanel project token:
   ```
   VITE_MIXPANEL_TOKEN=your_actual_token_here
   ```

## 2. What's Already Tracked

The Mixpanel integration is already implemented and tracks the following key interactions:

### User Authentication
- **User Login**: When users log in with Auth0
- **User Logout**: When users log out
- **User Identification**: Links Mixpanel profiles to authenticated users

### Room Management
- **Room Created**: When users create new rooms
- **Room Joined**: When users join existing rooms (with join method)
- **Player Created**: When new players are created in rooms
- **Player Linked**: When users link to existing players

### Availability Management
- **Availability Prompt Shown**: When availability modal appears
- **Availability Set**: Each time a user sets availability for a gameweek
- **Availability Prompt Completed**: When users complete all availability responses

### Gameweek Management
- **Gameweek Created**: When new fixtures are added
- **Result Recorded**: When match results are submitted
- **Teams Generated**: When teams are automatically or manually generated

### Player Interactions
- **Player Details Viewed**: When detailed player stats are viewed
- **Player Card Expanded**: When player cards are expanded to show more details
- **Favorite Teammates Viewed**: When users view teammate analytics
- **Formidable Opponents Viewed**: When users view opponent analytics

### Navigation
- **Page View**: Tracks page visits with context
- **Tab Changed**: When users switch between Players/Fixtures/Account tabs

### Performance & Errors
- **Performance**: Tracks timing for key operations (room creation, result recording, etc.)
- **Error Occurred**: Tracks application errors with context

## 3. Event Properties

Each event includes relevant properties for analysis:

### Common Properties (added to all events)
- `timestamp`: ISO timestamp
- `url`: Current page URL
- `user_agent`: Browser user agent
- `room_code`: Current room code (when applicable)
- `has_joined_room`: Whether user has joined a room

### User Properties (set during identification)
- `has_joined_room`: Boolean
- `room_code`: Current room code
- `room_name`: Current room name

## 4. Customization Options

### Adding New Events
To track additional interactions, use the tracking functions from `utils/mixpanel.js`:

```javascript
import { trackEvent, trackFeatureUsed } from '../utils/mixpanel';

// Generic event tracking
trackEvent('Custom Event Name', {
  custom_property: 'value',
  another_property: 123
});

// Feature usage tracking
trackFeatureUsed('feature_name', {
  feature_context: 'additional_info'
});
```

### Modifying Existing Events
Edit the tracking functions in `client/footy-client/src/utils/mixpanel.js` to adjust what data is collected.

### Privacy Considerations
The current setup:
- Does NOT track IP addresses (`ip: false`)
- Uses localStorage for persistence
- Only tracks user interaction events, not personal data
- Includes debugging in development mode only

## 5. Viewing Your Data

Once set up and users start interacting with your app:

1. Go to your Mixpanel dashboard
2. Navigate to "Insights" to see event trends
3. Use "Users" to see individual user journeys
4. Create custom reports and funnels based on your tracked events

## 6. Useful Analysis Ideas

With the tracked events, you can analyze:

### User Onboarding
- How many users create vs join rooms?
- What's the drop-off rate between joining and completing player setup?
- How long does it take users to complete their first availability setting?

### Feature Usage
- Which features are most/least used?
- Do users prefer manual team generation or automatic?
- How often do users view detailed player analytics?

### Performance Monitoring
- Which operations are slowest?
- Where do users experience the most errors?
- How has performance changed over time?

### User Engagement
- How often do users return to set availability?
- Which tabs do users spend the most time on?
- What's the correlation between feature usage and user retention?

## 7. Troubleshooting

### Events Not Appearing
1. Check that your Mixpanel token is correctly set in `.env`
2. Verify the token in your browser's developer tools console
3. Ensure you're in the correct Mixpanel project

### Missing Data
1. Check browser console for any JavaScript errors
2. Verify that Mixpanel initialization succeeded (look for "Mixpanel initialized" in console)
3. Test events in development mode where debug logging is enabled

### Performance Impact
The Mixpanel integration is lightweight, but if you notice performance issues:
1. Events are batched automatically by Mixpanel
2. Only essential data is tracked
3. Failed tracking calls won't break app functionality

## 8. Data Export & Integration

Mixpanel offers:
- Raw data export APIs
- Integration with data warehouses
- Webhook notifications for real-time processing
- CSV exports for ad-hoc analysis

---

**Ready to get started?** Just add your Mixpanel token to the `.env` file and your analytics will start working immediately!
