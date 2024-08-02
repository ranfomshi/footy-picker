import React, { useEffect, useState } from "react";
import "./App.css";
import AddPlayer from "./components/AddPlayer";
import axios from "axios";
import GameweekManager from "./components/GameweekManager";
import BottomNav from "./components/BottomNav";
import PlayerStats from "./components/PlayerStats";
import AccountManager from "./components/AccountManager";
import LinkPlayer from "./components/LinkPlayer";
import CreateOrJoinRoom from "./components/CreateOrJoinRoom";
import { Button, ConfigProvider, Typography, Spin } from "antd";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import useStore from "./useStore"; // Import the Zustand store

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
      scope="openid profile email offline_access"
      useRefreshTokens={true}
      cacheLocation="localstorage"
      audience="https://footy-picker.uk.auth0.com/api/v2/"
    >
      {children}
    </Auth0Provider>
  );
};

function App() {
  const { loginWithRedirect, logout, isAuthenticated, getAccessTokenSilently, user, error } = useAuth0();
  const [players, setPlayers] = useState([]);
  const [activeKey, setActiveKey] = useState(localStorage.getItem("activeKey") || "players");
  const [loading, setLoading] = useState(true);
  const [playerLinked, setPlayerLinked] = useState(false);
  const { hasJoinedRoom, roomCode, setHasJoinedRoom, setRoomCode, setRoomMembership } = useStore();

  const API_BASE_URL =
    import.meta.env.NODE_ENV === "production"
      ? "https://footy-picker-58753c2f9639.herokuapp.com/api"
      : "http://localhost:5000/api";

  const checkRoomMembership = async () => {
    alert(process.env.NODE_ENV)
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/check-room-membership`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRoomMembership(response.data.hasJoinedRoom, response.data.roomCode);
    } catch (error) {
      console.error("Error checking room membership", error);
    }
  };

  const checkPlayerLinked = async () => {
    alert(process.env.NODE_ENV)
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/players`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const linkedPlayer = response.data.find(player => player.auth0Id === user.sub);
      setPlayerLinked(!!linkedPlayer);
    } catch (error) {
      console.error("Error checking linked player", error);
    }
  };

  useEffect(() => {
    const performInitialChecks = async () => {
      if (isAuthenticated) {
        await checkRoomMembership();
        await checkPlayerLinked();
      }
      setLoading(false);
    };

    performInitialChecks();
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem("activeKey", activeKey);
  }, [activeKey]);

  useEffect(() => {
    if (error) {
      console.error("Auth0 Error:", error);
    }
  }, [error]);

  const handleRoomJoined = () => {
    setHasJoinedRoom(true);
    checkPlayerLinked();
  };

  const handlePlayerLinked = () => {
    setPlayerLinked(true);
    fetchPlayers();
  };

  const fetchPlayers = async () => {
    alert(process.env.NODE_ENV)
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
          colorPrimaryHover: "#00a363",
          colorPrimaryActive: "#008a53",
          colorPrimaryText: "#ffffff",
          colorPrimaryTextHover: "#ffffff",
          colorPrimaryTextActive: "#ffffff",
          colorPrimaryBg: "#00b96b",
          colorPrimaryBgHover: "#00a363",
          colorPrimaryBgActive: "#008a53",
          colorError: "#850101",
        },
      }}
    >
      <div className="App">
        <div className="header">
          {!isAuthenticated && (
            <Button
              type="primary"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => loginWithRedirect()}
            >
              Log in
            </Button>
          )}
        </div>
        <div className="content">
          <div
            style={{
              borderBottom: "1px solid black",
              marginBottom: 8,
              width: "100%",
            }}
          >
            <Title level={4} style={{ marginTop: 0 }}>Footy Picker</Title>
            {hasJoinedRoom && <Paragraph>Room Code: <Text code strong>{roomCode}</Text></Paragraph>}
          </div>
          {isAuthenticated ? (
            loading ? (
              <Spin size="large" />
            ) : hasJoinedRoom ? (
              playerLinked ? (
                renderContent()
              ) : (
                <LinkPlayer onPlayerLinked={handlePlayerLinked} />
              )
            ) : (
              !playerLinked && !roomCode&&<CreateOrJoinRoom onRoomJoined={handleRoomJoined} />
            )
          ) : (
            <Paragraph>Please log in</Paragraph>
          )}
        </div>
        <div className="bottom-nav">
          <BottomNav activeKey={activeKey} onChange={setActiveKey} />
        </div>
      </div>
    </ConfigProvider>
  );
}

export default () => (
  <Auth0ProviderWithHistory>
    <App />
  </Auth0ProviderWithHistory>
);
