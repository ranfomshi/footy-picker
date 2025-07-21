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

const { Title, Text, Paragraph } = Typography;

const Auth0ProviderWithHistory = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = window.location.origin;

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
  const { isAuthenticated, getAccessTokenSilently, error } = useAuth0();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const checkRoomMembership = async () => {
    try {
      const token = await getAccessTokenSilently();
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
    } catch (error) {
      console.error("Error checking room membership", error);
    }
  };

  useEffect(() => {
    const performInitialChecks = async () => {
      if (isAuthenticated) {
        await checkRoomMembership();
      }
      setLoading(false);
    };

    performInitialChecks();
  }, [isAuthenticated, roomCode]);

  useEffect(() => {
    if (error) {
      console.error("Auth0 Error:", error);
    }
  }, [error]);

  // Redirect to /players if on root and has joined room
  useEffect(() => {
    if (isAuthenticated && hasJoinedRoom && location.pathname === '/') {
      navigate('/players', { replace: true });
    }
  }, [isAuthenticated, hasJoinedRoom, location.pathname, navigate]);

  const handleRoomJoined = async () => {
    setHasJoinedRoom(true);
    const token = await getAccessTokenSilently();
    const response = await axios.get(`${API_BASE_URL}/players`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setPlayers(response.data);
    navigate('/players'); // Navigate to players page after joining room
  };

  const handleNavigation = (key) => {
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

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div className="App">
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
              Organize your football teams with ease. Track stats, manage players, and make every game count.
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
  const { loginWithRedirect } = useAuth0();

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
