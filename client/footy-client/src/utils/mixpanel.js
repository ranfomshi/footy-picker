import mixpanel from 'mixpanel-browser';

// Initialize Mixpanel (you'll need to provide your project token)
const MIXPANEL_TOKEN = process.env.VITE_MIXPANEL_TOKEN || 'YOUR_MIXPANEL_TOKEN_HERE';

let isInitialized = false;

export const initMixpanel = () => {
  if (!isInitialized && MIXPANEL_TOKEN && MIXPANEL_TOKEN !== 'YOUR_MIXPANEL_TOKEN_HERE') {
    mixpanel.init(MIXPANEL_TOKEN, {
      debug: import.meta.env.DEV,
      track_pageview: true,
      persistence: 'localStorage',
      ip: false, // Don't track IP for privacy
      api_host: 'https://api.mixpanel.com', // Default Mixpanel endpoint
    });
    isInitialized = true;
    console.log('Mixpanel initialized');
  }
};

// User identification
export const identifyUser = (userId, userProperties = {}) => {
  if (!isInitialized) return;
  
  mixpanel.identify(userId);
  if (Object.keys(userProperties).length > 0) {
    mixpanel.people.set(userProperties);
  }
};

// Track events
export const trackEvent = (eventName, properties = {}) => {
  if (!isInitialized) return;
  
  mixpanel.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    user_agent: navigator.userAgent,
  });
};

// Track page views
export const trackPageView = (pageName, properties = {}) => {
  trackEvent('Page View', {
    page_name: pageName,
    ...properties,
  });
};

// User authentication events
export const trackUserLogin = (userId, loginMethod = 'auth0') => {
  trackEvent('User Login', {
    user_id: userId,
    login_method: loginMethod,
  });
};

export const trackUserLogout = () => {
  trackEvent('User Logout');
};

// Room management events
export const trackRoomCreated = (roomId, roomName, isPrivate = false) => {
  trackEvent('Room Created', {
    room_id: roomId,
    room_name: roomName,
    is_private: isPrivate,
  });
};

export const trackRoomJoined = (roomId, roomName, joinMethod = 'invitation') => {
  trackEvent('Room Joined', {
    room_id: roomId,
    room_name: roomName,
    join_method: joinMethod,
  });
};

// Player management events
export const trackPlayerCreated = (playerId, playerName, roomId) => {
  trackEvent('Player Created', {
    player_id: playerId,
    player_name: playerName,
    room_id: roomId,
  });
};

export const trackPlayerLinked = (playerId, playerName, userId) => {
  trackEvent('Player Linked', {
    player_id: playerId,
    player_name: playerName,
    user_id: userId,
  });
};

// Availability events
export const trackAvailabilitySet = (playerId, gameweekId, isAvailable, roomId) => {
  trackEvent('Availability Set', {
    player_id: playerId,
    gameweek_id: gameweekId,
    is_available: isAvailable,
    room_id: roomId,
  });
};

export const trackAvailabilityPromptShown = (gameweekCount, roomId) => {
  trackEvent('Availability Prompt Shown', {
    gameweek_count: gameweekCount,
    room_id: roomId,
  });
};

export const trackAvailabilityPromptCompleted = (gameweekCount, roomId, timeToComplete) => {
  trackEvent('Availability Prompt Completed', {
    gameweek_count: gameweekCount,
    room_id: roomId,
    time_to_complete_seconds: timeToComplete,
  });
};

// Gameweek and team management
export const trackGameweekCreated = (gameweekId, roomId, date, location) => {
  trackEvent('Gameweek Created', {
    gameweek_id: gameweekId,
    room_id: roomId,
    gameweek_date: date,
    location: location,
  });
};

export const trackTeamsGenerated = (gameweekId, roomId, teamGenerationMethod, playerCount) => {
  trackEvent('Teams Generated', {
    gameweek_id: gameweekId,
    room_id: roomId,
    generation_method: teamGenerationMethod,
    player_count: playerCount,
  });
};

export const trackResultRecorded = (gameweekId, roomId, team1Score, team2Score, playerOfTheMatch) => {
  trackEvent('Result Recorded', {
    gameweek_id: gameweekId,
    room_id: roomId,
    team1_score: team1Score,
    team2_score: team2Score,
    player_of_the_match: playerOfTheMatch,
    goal_difference: Math.abs(team1Score - team2Score),
  });
};

// Player interaction events
export const trackPlayerDetailsViewed = (playerId, playerName, roomId) => {
  trackEvent('Player Details Viewed', {
    player_id: playerId,
    player_name: playerName,
    room_id: roomId,
  });
};

export const trackPlayerCardExpanded = (playerId, playerName) => {
  trackEvent('Player Card Expanded', {
    player_id: playerId,
    player_name: playerName,
  });
};

export const trackFavoriteTeammatesViewed = (playerId, teammateCount) => {
  trackEvent('Favorite Teammates Viewed', {
    player_id: playerId,
    teammate_count: teammateCount,
  });
};

export const trackFormidableOpponentsViewed = (playerId, opponentCount) => {
  trackEvent('Formidable Opponents Viewed', {
    player_id: playerId,
    opponent_count: opponentCount,
  });
};

// Navigation events
export const trackTabChanged = (fromTab, toTab, roomId) => {
  trackEvent('Tab Changed', {
    from_tab: fromTab,
    to_tab: toTab,
    room_id: roomId,
  });
};

// Feature usage events
export const trackFeatureUsed = (featureName, properties = {}) => {
  trackEvent('Feature Used', {
    feature_name: featureName,
    ...properties,
  });
};

// Error tracking
export const trackError = (errorType, errorMessage, context = {}) => {
  trackEvent('Error Occurred', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
};

// Performance tracking
export const trackPerformance = (actionName, duration, success = true) => {
  trackEvent('Performance', {
    action_name: actionName,
    duration_ms: duration,
    success: success,
  });
};

export default {
  initMixpanel,
  identifyUser,
  trackEvent,
  trackPageView,
  trackUserLogin,
  trackUserLogout,
  trackRoomCreated,
  trackRoomJoined,
  trackPlayerCreated,
  trackPlayerLinked,
  trackAvailabilitySet,
  trackAvailabilityPromptShown,
  trackAvailabilityPromptCompleted,
  trackGameweekCreated,
  trackTeamsGenerated,
  trackResultRecorded,
  trackPlayerDetailsViewed,
  trackPlayerCardExpanded,
  trackFavoriteTeammatesViewed,
  trackFormidableOpponentsViewed,
  trackTabChanged,
  trackFeatureUsed,
  trackError,
  trackPerformance,
};
