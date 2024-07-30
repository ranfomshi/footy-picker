import React, { useEffect, useState } from "react";
import "./App.css";
import AddPlayer from "./components/AddPlayer";
import axios from "axios";
import GameweekManager from "./components/GameweekManager";
import BottomNav from "./components/BottomNav";
import PlayerStats from "./components/PlayerStats";
import AccountManager from "./components/AccountManager";
import { Button, ConfigProvider, theme } from "antd";
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";

console.log("Auth0 Domain:", import.meta.env.VITE_AUTH0_DOMAIN);
console.log("Auth0 Client ID:", import.meta.env.VITE_AUTH0_CLIENT_ID);

const Auth0ProviderWithHistory = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = window.location.origin;

  if (!domain || !clientId) {
    return <div>Error: Missing Auth0 environment variables</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
    >
      {children}
    </Auth0Provider>
  );
};

function App() {
  const { loginWithRedirect, logout, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [players, setPlayers] = useState([]);
  const [activeKey, setActiveKey] = useState("players");

  const API_BASE_URL =
    import.meta.env.NODE_ENV === "production"
      ? "https://footy-picker-58753c2f9639.herokuapp.com/api"
      : "http://localhost:5000/api";

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlayers();
    }
  }, [isAuthenticated]);

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
          {isAuthenticated && (
            <Button
              type="primary"
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
              }}
              onClick={() => logout({ returnTo: window.location.origin })}
            >
              Log out
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
            <h4 style={{ marginTop: 0 }}>Footy Picker</h4>
          </div>
          {isAuthenticated ? renderContent() : <p>Please log in</p>}
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
