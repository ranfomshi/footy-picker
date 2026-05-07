import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from "react-router-dom"; // Import updated routing components
import "./App.css";
import axios from "axios";
import GameweekManager from "./components/GameweekManager";
import BottomNav from "./components/BottomNav";
import PlayerStats from "./components/PlayerStats";
import AccountManager from "./components/AccountManager";
import CreateOrJoinRoom from "./components/CreateOrJoinRoom";
import Privacy from "./components/PrivacyPolicy"; // Import PrivacyPolicy
import Support from "./components/Support";
import { Button, ConfigProvider, Typography, Spin, Image, Space } from "antd";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import useStore from "./useStore";
import Avatar from "./components/Avatar";
import { fetchPlayersWithCache } from "./utils/playerCache";
import { initMixpanel, identifyUser, trackUserLogin, trackPageView, trackTabChanged, trackRoomJoined } from "./utils/mixpanel";

const { Title, Text, Paragraph } = Typography;

const Auth0ProviderWithHistory = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = window.location.origin;
  const logoutUrl = window.location.origin;

  const onRedirectCallback = (appState) => {
    window.history.replaceState(
      {},
      document.title,
      appState?.returnTo || window.location.pathname
    );
  };

  if (!domain || !clientId) {
    return <div>Error: Missing Auth0 environment variables</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
      onRedirectCallback={onRedirectCallback}
      scope="openid profile email"
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

// Main app content component that uses routing
const AppContent = () => {
  const { isAuthenticated, isLoading: isAuthLoading, getAccessTokenSilently, error, loginWithRedirect, logout, user } = useAuth0();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installingApp, setInstallingApp] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showMovingBanner, setShowMovingBanner] = useState(() => sessionStorage.getItem('moving-banner-dismissed') !== '1');
  const location = useLocation();
  const navigate = useNavigate();
  const {
    hasJoinedRoom,
    roomCode,
    setHasJoinedRoom,
    roomName,
    setRoomMembership,
  } = useStore();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Get current active key from the route
  const getActiveKeyFromPath = (pathname) => {
    switch (pathname) {
      case '/players':
        return 'playerStats';
      case '/fixtures':
        return 'fixtures';
      case '/account':
        return 'account';
      default:
        return 'playerStats';
    }
  };

  const activeKey = getActiveKeyFromPath(location.pathname);

  useEffect(() => {
    let isMounted = true;

    const performInitialChecks = async () => {
      if (isAuthLoading) return;
      if (!isMounted) return;

      setLoading(true);
      let pendingLogoutRedirect = false;

      if (!isAuthenticated) {
        setRoomMembership(false, '', '', null, null);
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        if (!isMounted) return;

        const { data } = await axios.get(`${API_BASE_URL}/check-room-membership`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        // If we have an activeRoom object, mark joined and pull its code & name
        if (data.activeRoom) {
          const { code, name, teamAColor, teamBColor } = data.activeRoom;
          setRoomMembership(true, code, name, teamAColor, teamBColor);
        } else {
          setRoomMembership(false, '', '', null, null);
        }
      } catch (authError) {
        console.error("Error checking auth session", authError);

        const authErrorText = `${authError?.error || ''} ${authError?.message || ''}`.toLowerCase();
        const invalidSessionCodes = ['login_required', 'consent_required', 'missing_refresh_token', 'invalid_grant'];
        const shouldLogout = invalidSessionCodes.some(code => authErrorText.includes(code));

        setRoomMembership(false, '', '', null, null);

        if (shouldLogout) {
          pendingLogoutRedirect = true;
          localStorage.clear();
          logout({
            logoutParams: {
              returnTo: window.location.origin
            }
          });
        }
      } finally {
        if (isMounted && !pendingLogoutRedirect) {
          setLoading(false);
        }
      }
    };

    performInitialChecks();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isAuthenticated, getAccessTokenSilently, logout, API_BASE_URL, setRoomMembership]);

  // Initialize Mixpanel and identify user when authenticated
  useEffect(() => {
    // Initialize Mixpanel on app load
    initMixpanel();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get user info from Auth0 and identify in Mixpanel
      getAccessTokenSilently().then(() => {
        // Use Auth0 user details for Mixpanel identification
        identifyUser(user.sub, {
          // Auth0 user properties
          $email: user.email,
          $name: user.name,
          $first_name: user.given_name,
          $last_name: user.family_name,
          nickname: user.nickname,
          picture: user.picture,
          email_verified: user.email_verified,
          locale: user.locale,
          auth0_user_id: user.sub,

          // App-specific properties
          has_joined_room: hasJoinedRoom,
          room_code: roomCode,
          room_name: roomName,
          last_login: new Date().toISOString(),
        });

        trackUserLogin(user.sub, 'auth0');
      }).catch(console.error);
    }
  }, [isAuthenticated, user, hasJoinedRoom, roomCode, roomName]);

  // Track page views
  useEffect(() => {
    trackPageView(getActiveKeyFromPath(location.pathname), {
      room_code: roomCode,
      has_joined_room: hasJoinedRoom,
    });
  }, [location.pathname, roomCode, hasJoinedRoom]);

  useEffect(() => {
    if (error) {
      console.error("Auth0 Error:", error);
    }
  }, [error]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandaloneApp(isStandalone);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandaloneApp(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Redirect to /players if on root and has joined room
  useEffect(() => {
    if (isAuthenticated && hasJoinedRoom && location.pathname === '/') {
      navigate('/players', { replace: true });
    }
  }, [isAuthenticated, hasJoinedRoom, location.pathname, navigate]);

  const handleRoomJoined = async () => {
    setHasJoinedRoom(true);

    // Track room join event
    trackRoomJoined(roomCode, roomName, 'app_navigation');

    try {
      await fetchPlayersWithCache(getAccessTokenSilently, setPlayers, () => { });
    } catch (error) {
      console.error('Error fetching players after room join:', error);
    }
    navigate('/players'); // Navigate to players page after joining room
  };

  const handleNavigation = (key) => {
    const currentTab = getActiveKeyFromPath(location.pathname);

    // Track tab change
    trackTabChanged(currentTab, key, roomCode);

    switch (key) {
      case 'playerStats':
        navigate('/players');
        break;
      case 'fixtures':
        navigate('/fixtures');
        break;
      case 'account':
        navigate('/account');
        break;
      default:
        navigate('/players');
    }
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;

    try {
      setInstallingApp(true);
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      setInstallingApp(false);
    }
  };

  if (loading) {
    return <Spin size="large" />;
  }

  const dismissMovingBanner = () => {
    sessionStorage.setItem('moving-banner-dismissed', '1');
    setShowMovingBanner(false);
  };

  return (
    <div className="App">
      {showMovingBanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 13,
          color: '#664d03',
        }}>
          <span>
            ⚠️ Teamix is moving! This app will be replaced at the end of May 2026.{' '}
            <a href="https://teamixnew.netlify.app" target="_blank" rel="noopener noreferrer" style={{ color: '#664d03', fontWeight: 'bold', textDecoration: 'underline' }}>
              Visit the new app here.
            </a>
          </span>
          <button
            onClick={dismissMovingBanner}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: '#664d03', padding: '0 4px' }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {!isStandaloneApp && deferredInstallPrompt && (
        <div style={{
          position: 'fixed',
          top: isAuthenticated && hasJoinedRoom ? 74 : 16,
          right: 16,
          zIndex: 20
        }}>
          <Button
            type="primary"
            onClick={handleInstallApp}
            loading={installingApp}
            style={{
              borderRadius: 8,
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
            }}
          >
            Install App
          </Button>
        </div>
      )}

      {isAuthenticated && hasJoinedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
          boxShadow: '0 4px 20px rgba(0, 185, 107, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100vw',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 5 }}>
            <Avatar />
            <div>
              <Text strong style={{
                fontSize: '14px',
                color: 'white',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                display: 'block',
                lineHeight: 1.2
              }}>
                {roomName}
              </Text>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            padding: '6px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.3)',
            marginRight: '16px'
          }}>
            <Text style={{
              fontSize: '12px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontWeight: 'bold',
              color: 'white',
              letterSpacing: '1px'
            }}>
              {roomCode}
            </Text>
          </div>
        </div>
      )}
      {isAuthenticated && !hasJoinedRoom && (
        <div style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 10
        }}>
          <Avatar />
        </div>
      )}
      {!isAuthenticated && (
        <div className="header" style={{ marginLeft: '60px' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <Image
              width={80}
              height={80}
              preview={false}
              src="fp_logo.png"
              style={{ marginBottom: "16px" }}
            />
            <Title level={2} style={{ marginBottom: "8px", color: '#00b96b' }}>
              Teamix
            </Title>
            <Paragraph style={{ marginBottom: "24px", color: '#666', maxWidth: '300px' }}>
              Organize your sport team with ease. Track stats, manage players, and make every game count.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => loginWithRedirect()}
              style={{
                borderRadius: '8px',
                height: '44px',
                fontSize: '16px',
                paddingLeft: '32px',
                paddingRight: '32px'
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      )}

      <div className="content scroll-list" style={{
        paddingTop: hasJoinedRoom ? '64px' : '8px'
      }}>
        {isAuthenticated ? (
          hasJoinedRoom ? (
            <Routes>
              <Route path="/players" element={<PlayerStats />} />
              <Route path="/fixtures" element={<GameweekManager />} />
              <Route path="/account" element={<AccountManager />} />
              <Route path="/" element={<PlayerStats />} />
            </Routes>
          ) : (
            <CreateOrJoinRoom onRoomJoined={handleRoomJoined} />
          )
        ) : (
          <></>
        )}
      </div>

      <div className="bottom-nav">
        <BottomNav activeKey={activeKey} onChange={handleNavigation} />
      </div>
    </div>
  );
};

function App() {
  return (
    <ConfigProvider
      componentSize="small"
      theme={{
        token: {
          fontFamily: "Trebuchet MS, sans-serif",
          colorPrimary: "#00b96b",
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default () => (
  <Auth0ProviderWithHistory>
    <App />
  </Auth0ProviderWithHistory>
);
