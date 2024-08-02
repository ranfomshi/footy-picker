import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Input, Space, Typography, Select, message, Spin } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const LinkPlayer = ({ onPlayerLinked }) => {
    const { user, getAccessTokenSilently } = useAuth0();
    const [players, setPlayers] = useState([]);
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [loading, setLoading] = useState(true); // Initial loading state
    const [creatingPlayer, setCreatingPlayer] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [room, setRoom] = useState(null);
    const [hasUnlinkedPlayers, setHasUnlinkedPlayers] = useState(false);
    const [linkingLoading, setLinkingLoading] = useState(false);

    const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://footy-picker-58753c2f9639.herokuapp.com/api' : 'http://localhost:5000/api';

    useEffect(() => {
        const fetchRoomMembership = async () => {
            setLoading(true);
            try {
                const token = await getAccessTokenSilently();
                const response = await axios.get(`${API_BASE_URL}/check-room-membership`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.data.hasJoinedRoom) {
                    setRoom(true);
                }
            } catch (error) {
                console.error("Error fetching room membership", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRoomMembership();
    }, [getAccessTokenSilently]);

    useEffect(() => {
        if (room) {
            const fetchPlayers = async () => {
                alert(process.env.NODE_ENV)
                setLoading(true);
                try {
                    const token = await getAccessTokenSilently();
                    const response = await axios.get(`${API_BASE_URL}/players`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    setPlayers(response.data);
                    setHasUnlinkedPlayers(response.data.length > 0);
                } catch (error) {
                    console.error("Error fetching players", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchPlayers();
        }
    }, [getAccessTokenSilently, room]);

    const linkPlayer = async () => {
        if (!selectedPlayerId) {
            message.error("Please select a player");
            return;
        }

        setLinkingLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.put(`${API_BASE_URL}/players/${selectedPlayerId}/link`, { auth0Id: user.sub }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            message.success("Player linked successfully");
            onPlayerLinked();
        } catch (error) {
            console.error("Error linking player", error);
            message.error(error.response?.data?.error || "Error linking player");
        } finally {
            setLinkingLoading(false);
        }
    };

    const createAndLinkPlayer = async () => {
        if (!newPlayerName.trim()) {
            message.error("Player name cannot be empty");
            return;
        }

        setLinkingLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(`${API_BASE_URL}/players`, { name: newPlayerName }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            await axios.post(`${API_BASE_URL}/link-player`, { playerId: response.data.id }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            message.success('Player created and linked successfully');
            onPlayerLinked();
        } catch (error) {
            console.error('Error creating and linking player:', error);
            message.error(error.response?.data?.error || "Error creating and linking player");
        } finally {
            setLinkingLoading(false);
        }
    };

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <div>
            <Title level={2}>Link Your Account to a Player</Title>
            {creatingPlayer || !hasUnlinkedPlayers ? (
                <Space direction="vertical">
                    <Input
                        placeholder="Enter new player name"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        disabled={linkingLoading}
                    />
                    <Button type="primary" onClick={createAndLinkPlayer} loading={linkingLoading}>
                        Create and Link Player
                    </Button>
                    {hasUnlinkedPlayers && (
                        <Button onClick={() => setCreatingPlayer(false)} disabled={linkingLoading}>
                            Cancel
                        </Button>
                    )}
                </Space>
            ) : (
                <Space direction="vertical">
                    <Select
                        placeholder="Select a player"
                        onChange={(value) => setSelectedPlayerId(value)}
                        value={selectedPlayerId}
                        style={{ width: '100%' }}
                        disabled={linkingLoading}
                    >
                        {players.map(player => (
                            <Option key={player.id} value={player.id}>
                                {player.name}
                            </Option>
                        ))}
                    </Select>
                    <Button type="primary" onClick={linkPlayer} loading={linkingLoading}>
                        Link Player
                    </Button>
                    <Button onClick={() => setCreatingPlayer(true)} disabled={linkingLoading}>
                        Create New Player
                    </Button>
                </Space>
            )}
        </div>
    );
};

export default LinkPlayer;
