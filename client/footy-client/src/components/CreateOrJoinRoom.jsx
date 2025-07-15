import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import {
    Button,
    Input,
    Form,
    Space,
    message,
    Modal,
    Radio,
    Divider,
    Typography,
    Select,
} from 'antd';
import useStore from '../useStore';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const CreateOrJoinRoom = ({ onRoomJoined, checkMembership }) => {
    const { getAccessTokenSilently, logout, user } = useAuth0();
    const [mode, setMode] = useState('join');
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    const [sports, setSports] = useState([]);
    const [selectedSport, setSelectedSport] = useState(null);
    const [teamAColor, setTeamAColor] = useState('#21C67C');
    const [teamBColor, setTeamBColor] = useState('#FFC107');

    const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerModalVisible, setPlayerModalVisible] = useState(false);

    const { setHasJoinedRoom, setRoomCode: setGlobalCode, setRoomName: setGlobalName } = useStore();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Log out on 401 errors
    const handleAuthError = (err) => {
        if (err.response?.status === 401) {
            logout({ returnTo: window.location.origin });
        }
    };

    // Fetch sports list for room creation
    useEffect(() => {
        axios.get(`${API_BASE_URL}/sports`)
            .then(({ data }) => {
                setSports(data);
                if (data.length) setSelectedSport(data[0].id);
            })
            .catch((err) => console.error('Failed to load sports', err));
    }, []);

    // Create room
    const createRoom = async () => {
        if (!roomName.trim()) {
            return message.error('Enter a room name');
        }
        if (!selectedSport) {
            return message.error('Select a sport');
        }

        setCreateLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const payload = {
                name: roomName,
                sportId: selectedSport,
                teamAColor,
                teamBColor,
            };
            const { data } = await axios.post(
                `${API_BASE_URL}/create-room`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            message.success(`Room '${data.room.name}' created! Code: ${data.room.code}`);
            setGlobalCode(data.room.code);
            setGlobalName(data.room.name);
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (err) {
            handleAuthError(err);
            console.error(err);
            message.error('Unable to create room');
        } finally {
            setCreateLoading(false);
        }
    };

    // Start join flow
    const joinRoom = async () => {
        if (!roomCode.trim() || roomCode.length !== 5) {
            return message.error('Enter a valid 5‑char room code');
        }
        setJoinLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const { data } = await axios.post(
                `${API_BASE_URL}/join-room`,
                { code: roomCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.status === 'unlinked' && data.unlinkedPlayers?.length) {
                setUnlinkedPlayers(data.unlinkedPlayers);
                setPlayerModalVisible(true);
            } else {
                await finalizeJoin(null);
            }
        } catch (err) {
            handleAuthError(err);
            console.error(err);
            message.error('Failed to join room');
        } finally {
            setJoinLoading(false);
        }
    };

    // Link or create player
    const finalizeJoin = async (playerId) => {
        setFinalizing(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${API_BASE_URL}/finalize-join-room`,
                { roomCode, playerId, newPlayerName: playerId ? null : user.name },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            message.success('Welcome to the room!');
            setGlobalCode(roomCode);
            // Refresh store with name+code
            if (typeof checkMembership === 'function') await checkMembership();
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (err) {
            handleAuthError(err);
            console.error(err);
            message.error('Could not complete joining');
        } finally {
            setFinalizing(false);
            setPlayerModalVisible(false);
            setSelectedPlayer(null);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: 'auto', padding: 20, textAlign: 'center' }}>
            <Title level={2}>Teamix</Title>
            <Paragraph>Create or join a room to start splitting into balanced teams.</Paragraph>
            <Divider />

            {mode === 'join' ? (
                <Form layout="vertical">
                    <Form.Item label="Room Code">
                        <Input
                            placeholder="ABCDE"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.trim())}
                            onPressEnter={joinRoom}
                            disabled={joinLoading || finalizing}
                            maxLength={5}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" block size="large" onClick={joinRoom} loading={joinLoading}>
                                Join
                            </Button>
                            <Button block size="large" onClick={() => setMode('create')} disabled={joinLoading}>
                                Create Instead
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            ) : (
                <Form layout="vertical">
                    <Form.Item label="Room Name" required>
                        <Input
                            placeholder="My Awesome Room"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            onPressEnter={createRoom}
                            disabled={createLoading}
                        />
                    </Form.Item>
                    <Form.Item label="Sport" required>
                        <Select
                            value={selectedSport}
                            onChange={setSelectedSport}
                            disabled={createLoading}
                        >
                            {sports.map((s) => (
                                <Option key={s.id} value={s.id}>{s.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Team A Color">
                        <Input
                            type="color"
                            value={teamAColor}
                            onChange={(e) => setTeamAColor(e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item label="Team B Color">
                        <Input
                            type="color"
                            value={teamBColor}
                            onChange={(e) => setTeamBColor(e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" block size="large" onClick={createRoom} loading={createLoading}>
                                Create Room
                            </Button>
                            <Button block size="large" onClick={() => setMode('join')} disabled={createLoading}>
                                Back to Join
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            )}

            <Modal
                title="Select Your Player"
                visible={playerModalVisible}
                footer={null}
                onCancel={() => setPlayerModalVisible(false)}
            >
                <Paragraph>Select an existing player or create a new one:</Paragraph>
                <Radio.Group
                    onChange={(e) => setSelectedPlayer(e.target.value)}
                    value={selectedPlayer}
                    style={{ display: 'block', maxHeight: '40vh', overflowY: 'auto' }}
                >
                    {unlinkedPlayers.map((p) => (
                        <Radio key={p.id} value={p.id} style={{ display: 'block', margin: '8px 0' }}>
                            {p.name}
                        </Radio>
                    ))}
                </Radio.Group>
                <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                    <Button block onClick={() => finalizeJoin(null)} disabled={finalizing || selectedPlayer !== null}>
                        Create New Player
                    </Button>
                    <Button
                        type="primary"
                        block
                        onClick={() => finalizeJoin(selectedPlayer)}
                        disabled={finalizing || !selectedPlayer}
                        loading={finalizing}
                    >
                        I'm {unlinkedPlayers.find((p) => p.id === selectedPlayer)?.name}
                    </Button>
                </Space>
            </Modal>
        </div>
    );
};

export default CreateOrJoinRoom;
