import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Import updated routing components
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

function App() {
  const { loginWithRedirect, isAuthenticated, getAccessTokenSilently, error } =
    useAuth0();
  const [players, setPlayers] = useState([]);
  const [activeKey, setActiveKey] = useState("playerStats");
  const [loading, setLoading] = useState(true);
  const {
    hasJoinedRoom,
    roomCode,
    setHasJoinedRoom,
    roomName,
    setRoomMembership,
  } = useStore();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
    localStorage.setItem("activeKey", activeKey);
  }, [activeKey]);

  useEffect(() => {
    if (error) {
      console.error("Auth0 Error:", error);
    }
  }, [error]);

  const handleRoomJoined = async () => {
    setHasJoinedRoom(true);
    const token = await getAccessTokenSilently();
    const response = await axios.get(`${API_BASE_URL}/players`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setPlayers(response.data);
    setActiveKey("playerStats"); // Set active component to "PlayerStats"
  };

  const fetchPlayers = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/players`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPlayers(response.data);
    } catch (error) {
      console.error("Error fetching players", error);
    }
  };

  const renderContent = () => {
    switch (activeKey) {
      case "gameweeks":
        return <GameweekManager />;
      case "playerStats":
        return <PlayerStats />;
      case "account":
        return <AccountManager />;
      default:
        return <PlayerStats />;
    }
  };

  if (loading) {
    return <Spin size="large" />;
  }

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
        <div className="App">
          {isAuthenticated && <Avatar />}
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
          <Routes>
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            <Route
              path="/"
              element={
                <div className="content scroll-list">
                  {hasJoinedRoom && (
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        marginLeft: '60px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '14px', color: '#389e0d' }}>
                          {roomName}
                        </Text>
                        <Text
                          code
                          style={{
                            fontSize: '12px'
                          }}
                        >
                          {roomCode}
                        </Text>
                      </div>
                    </div>
                  )}
                  {!hasJoinedRoom && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: '#fafafa',
                        marginBottom: '8px',
                        border: '1px solid #f0f0f0',
                        marginLeft: '60px'
                      }}
                    >
                      <Text style={{ fontSize: '14px', color: '#666' }}>
                        Welcome to Teamix
                      </Text>
                    </div>
                  )}
                  {isAuthenticated ? (
                    loading ? (
                      <Spin size="large" />
                    ) : hasJoinedRoom ? (
                      renderContent()
                    ) : (
                      <CreateOrJoinRoom onRoomJoined={handleRoomJoined} />
                    )
                  ) : (
                    <Paragraph>Please log in</Paragraph>
                  )}
                </div>
              }
            />
          </Routes>
          <div className="bottom-nav">
            <BottomNav activeKey={activeKey} onChange={setActiveKey} />
          </div>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default () => (
  <Auth0ProviderWithHistory>
    <App />
  </Auth0ProviderWithHistory>
);
