import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Import updated routing components
import "./App.css";
import AddPlayer from "./components/AddPlayer";
import axios from "axios";
import GameweekManager from "./components/GameweekManager";
import BottomNav from "./components/BottomNav";
import PlayerStats from "./components/PlayerStats";
import AccountManager from "./components/AccountManager";
import CreateOrJoinRoom from "./components/CreateOrJoinRoom";
import PrivacyPolicy from "./components/Support"; // Import PrivacyPolicy
import Support from "./components/Support"; // Import support component
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
  const [activeKey, setActiveKey] = useState("players");
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
      const response = await axios.get(
        `${API_BASE_URL}/check-room-membership`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRoomMembership(
        response.data.hasJoinedRoom,
        response.data.roomCode,
        response.data.roomName
      );
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
    setActiveKey("players"); // Set active component to "AddPlayer"
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
      case "players":
        return <AddPlayer fetchPlayers={fetchPlayers} players={players} />;
      case "gameweeks":
        return <GameweekManager />;
      case "playerStats":
        return <PlayerStats />;
      case "account":
        return <AccountManager />;
      default:
        return null;
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
          <div className="header">
            {!isAuthenticated && (
              <Space direction="vertical">
                <Image
                  width={200}
                  height={200}
                  preview={false}
                  src="fp_logo.png"
                  style={{ marginBottom: "20px" }}
                />
                <Button
                  type="primary"
                  size="large"
                  onClick={() => loginWithRedirect()}
                >
                  Log in
                </Button>
              </Space>
            )}
          </div>
          <Routes>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/"
              element={
                <div className="content scroll-list">
                  <div
                    style={{
                      borderBottom: "1px solid black",
                      marginBottom: 8,
                      width: "100%",
                    }}
                  >
                    {hasJoinedRoom ? (
                      <>
                        <Title level={4} style={{ marginTop: 0 }}>
                          {roomName}
                        </Title>
                      </>
                    ) : (
                      <Title level={4} style={{ marginTop: 0 }}>
                        Teamix
                      </Title>
                    )}
                    {hasJoinedRoom && (
                      <Paragraph>
                        Room Code: <Text code strong>{roomCode}</Text>
                      </Paragraph>
                    )}
                  </div>
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
