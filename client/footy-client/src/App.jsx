function App() {
  const { loginWithRedirect, isAuthenticated, getAccessTokenSilently, error, logout } = useAuth0(); // Added logout
  const [players, setPlayers] = useState([]);
  const [activeKey, setActiveKey] = useState("players");
  const [loading, setLoading] = useState(true);
  const { hasJoinedRoom, roomCode, setHasJoinedRoom, roomName, setRoomMembership } = useStore();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const checkRoomMembership = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/check-room-membership`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRoomMembership(response.data.hasJoinedRoom, response.data.roomCode, response.data.roomName);
    } catch (error) {
      console.error("Error checking room membership", error);
      // If token retrieval fails, log the user out
      if (error.error === "login_required" || error.error === "consent_required") {
        logout({ returnTo: window.location.origin });
      }
    }
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
      // If token retrieval fails, log the user out
      if (error.error === "login_required" || error.error === "consent_required") {
        logout({ returnTo: window.location.origin });
      }
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
              <Button type="primary" size="large" onClick={() => loginWithRedirect()}>
                Log in
              </Button>
            </Space>
          )}
        </div>
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
                Footy Picker
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
