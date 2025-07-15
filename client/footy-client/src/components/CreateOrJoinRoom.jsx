import React, { useState } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Input, Form, Space, message, Modal, Radio, Divider, Typography } from 'antd';
import useStore from '../useStore';

const { Title, Paragraph } = Typography;

const CreateOrJoinRoom = ({ onRoomJoined }) => {
    const { getAccessTokenSilently, logout, user } = useAuth0();
    const [mode, setMode] = useState('join'); // 'join' or 'create'
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerModalVisible, setPlayerModalVisible] = useState(false);

    const { setHasJoinedRoom, setRoomCode: setGlobalCode, setRoomName: setGlobalName } = useStore();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Handle 401 by forcing logout
    const handleAuthError = (err) => {
        if (err.response?.status === 401) {
            logout({ returnTo: window.location.origin });
        }
    };

    // Create a new room
    const createRoom = async () => {
        if (!roomName.trim()) {
            message.error('Room name is required');
            return;
        }
        setLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const payload = { name: roomName };
            const res = await axios.post(
                `${API_BASE_URL}/create-room`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const { code, room } = res.data;
            message.success(`Room created: ${code}`);
            setGlobalCode(code);
            setGlobalName(room.name);
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (error) {
            handleAuthError(error);
            console.error(error);
            message.error('Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    // Join an existing room
    const joinRoom = async () => {
        if (!roomCode.trim()) {
            message.error('Room code is required');
            return;
        }
        setLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await axios.post(
                `${API_BASE_URL}/join-room`,
                { code: roomCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.status === 'unlinked' && res.data.unlinkedPlayers.length > 0) {
                setUnlinkedPlayers(res.data.unlinkedPlayers);
                setPlayerModalVisible(true);
            } else {
                // auto link new player
                createAndLink(null);
            }
        } catch (error) {
            handleAuthError(error);
            console.error(error);
            message.error('Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    // Finalize joining by linking existing or creating new
    const createAndLink = async (playerId) => {
        setLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${API_BASE_URL}/finalize-join-room`,
                {
                    roomCode,
                    playerId,
                    newPlayerName: playerId ? null : user.name
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            message.success('Joined room successfully');
            setGlobalCode(roomCode);
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (error) {
            handleAuthError(error);
            console.error(error);
            message.error('Failed to finalize join');
        } finally {
            setLoading(false);
            setPlayerModalVisible(false);
            setSelectedPlayer(null);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: 'auto', padding: 20, textAlign: 'center' }}>
            <Title level={2}>Welcome to Teamix</Title>
            <Paragraph>Divide teams based on past results. Create or join a room to get started.</Paragraph>
            <Divider />

            {mode === 'join' ? (
                <Form layout="vertical">
                    <Form.Item label="Room Code">
                        <Input
                            placeholder="Enter code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            onPressEnter={joinRoom}
                            disabled={loading}
                            maxLength={5}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={joinRoom}
                                loading={loading}
                            >
                                Join Room
                            </Button>
                            <Button
                                block
                                size="large"
                                onClick={() => setMode('create')}
                                disabled={loading}
                            >
                                Create Room
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            ) : (
                <Form layout="vertical">
                    <Form.Item label="Room Name">
                        <Input
                            placeholder="Enter name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            onPressEnter={createRoom}
                            disabled={loading}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={createRoom}
                                loading={loading}
                            >
                                Create Room
                            </Button>
                            <Button
                                block
                                size="large"
                                onClick={() => setMode('join')}
                                disabled={loading}
                            >
                                Back to Join
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            )}

            <Modal
                title="Select Your Player"
                visible={playerModalVisible}
                onCancel={() => setPlayerModalVisible(false)}
                footer={null}
            >
                <Paragraph>Select your existing player or create a new one:</Paragraph>
                <Radio.Group
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    value={selectedPlayer}
                    style={{ width: '100%' }}
                >
                    {unlinkedPlayers.map((p) => (
                        <Radio key={p.id} value={p.id} style={{ display: 'block' }}>
                            {p.name}
                        </Radio>
                    ))}
                </Radio.Group>
                <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                    <Button
                        block
                        onClick={() => createAndLink(null)}
                        disabled={loading || selectedPlayer !== null}
                    >
                        Create New Player
                    </Button>
                    <Button
                        type="primary"
                        block
                        onClick={() => createAndLink(selectedPlayer)}
                        disabled={loading || !selectedPlayer}
                        loading={loading}
                    >
                        I'm {unlinkedPlayers.find((p) => p.id === selectedPlayer)?.name}
                    </Button>
                </Space>
            </Modal>
        </div>
    );
};

export default CreateOrJoinRoom;
