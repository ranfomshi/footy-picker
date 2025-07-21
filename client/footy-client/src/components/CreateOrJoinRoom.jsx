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
import { invalidatePlayersCache } from '../utils/playerCache';
import { trackRoomCreated, trackRoomJoined, trackPlayerCreated, trackPlayerLinked, trackError, trackPerformance } from '../utils/mixpanel';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const CreateOrJoinRoom = ({ onRoomJoined, checkMembership }) => {
    const { getAccessTokenSilently, logout, user } = useAuth0();
    const [mode, setMode] = useState('join');
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState({ create: false, join: false, finalize: false });

    const [sports, setSports] = useState([]);
    const [selectedSport, setSelectedSport] = useState(null);
    const [teamAColor, setTeamAColor] = useState('#21C67C');
    const [teamBColor, setTeamBColor] = useState('#FFC107');

    const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerModalVisible, setPlayerModalVisible] = useState(false);

    const { setHasJoinedRoom, setRoomCode: setGlobalCode, setRoomName: setGlobalName, setTeamColors } = useStore();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Handle auth errors
    const handleAuthError = (err) => {
        if (err.response?.status === 401) {
            localStorage.clear();
            logout({
                returnTo: window.location.origin,
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        }
    };

    // Load sports for room creation
    useEffect(() => {
        axios.get(`${API_BASE_URL}/sports`)
            .then(({ data }) => {
                setSports(data);
                if (data.length) setSelectedSport(data[0].id);
            })
            .catch(console.error);
    }, []);

    // Create a new room
    const handleCreate = async () => {
        if (!roomName.trim()) return message.error('Enter a room name');
        if (!selectedSport) return message.error('Select a sport');

        const startTime = Date.now();
        setLoading(l => ({ ...l, create: true }));
        try {
            const token = await getAccessTokenSilently();
            const { data } = await axios.post(
                `${API_BASE_URL}/create-room`,
                { name: roomName, sportId: selectedSport, teamAColor, teamBColor },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Track room creation
            trackRoomCreated(data.room.code, data.room.name, false); // Assuming rooms are public by default
            trackPerformance('create_room', Date.now() - startTime, true);

            message.success(`Room '${data.room.name}' created! Code: ${data.room.code}`);
            setGlobalCode(data.room.code);
            setGlobalName(data.room.name);
            setTeamColors(data.room.teamAColor, data.room.teamBColor);
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (err) {
            handleAuthError(err);
            console.error(err);

            // Track error
            trackError('create_room_failed', err.message, {
                room_name: roomName,
                sport_id: selectedSport
            });
            trackPerformance('create_room', Date.now() - startTime, false);

            message.error('Unable to create room');
        } finally {
            setLoading(l => ({ ...l, create: false }));
        }
    };

    // Fetch unlinked slots in the room
    const handleJoin = async () => {
        if (!roomCode.trim() || roomCode.length !== 5) {
            return message.error('Enter a valid 5‑char room code');
        }

        const startTime = Date.now();
        setLoading(l => ({ ...l, join: true }));
        try {
            const token = await getAccessTokenSilently();
            const { data } = await axios.post(
                `${API_BASE_URL}/join-room`,
                { code: roomCode },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Track successful room join attempt (showing player selection modal)
            trackPerformance('join_room_attempt', Date.now() - startTime, true);

            // Ensure we always have an array
            setUnlinkedPlayers(data.unlinkedPlayers || []);
            setPlayerModalVisible(true);
        } catch (err) {
            handleAuthError(err);
            console.error(err);

            // Track error
            trackError('join_room_failed', err.message, {
                room_code: roomCode
            });
            trackPerformance('join_room_attempt', Date.now() - startTime, false);

            message.error('Failed to join room');
        } finally {
            setLoading(l => ({ ...l, join: false }));
        }
    };

    // Finalize join: link or create player
    const handleFinalize = async (playerId) => {
        const startTime = Date.now();
        setLoading(l => ({ ...l, finalize: true }));
        try {
            const token = await getAccessTokenSilently();
            await axios.post(
                `${API_BASE_URL}/finalize-join-room`,
                { roomCode, playerId, newPlayerName: playerId ? null : user.name },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Invalidate cache when player is created or linked
            invalidatePlayersCache();

            // Track room join completion and player actions
            if (playerId) {
                trackPlayerLinked(playerId, 'existing_player', user.sub);
                trackRoomJoined(roomCode, 'unknown', 'link_existing_player');
            } else {
                trackPlayerCreated('new_player', user.name, roomCode);
                trackRoomJoined(roomCode, 'unknown', 'create_new_player');
            }
            trackPerformance('finalize_join_room', Date.now() - startTime, true);

            message.success('Welcome to the room!');
            setGlobalCode(roomCode);
            if (typeof checkMembership === 'function') await checkMembership();
            setHasJoinedRoom(true);
            onRoomJoined();
        } catch (err) {
            handleAuthError(err);
            console.error(err);
            message.error('Could not complete joining');
        } finally {
            setLoading(l => ({ ...l, finalize: false }));
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
                            onChange={e => setRoomCode(e.target.value.trim())}
                            onPressEnter={handleJoin}
                            disabled={loading.join || loading.finalize}
                            maxLength={5}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                type="primary"
                                block size="large"
                                onClick={handleJoin}
                                loading={loading.join}
                            >Join</Button>
                            <Button
                                block size="large"
                                onClick={() => setMode('create')}
                                disabled={loading.join}
                            >Create Instead</Button>
                        </Space>
                    </Form.Item>
                </Form>
            ) : (
                <Form layout="vertical">
                    <Form.Item label="Room Name" required>
                        <Input
                            placeholder="My Awesome Room"
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            onPressEnter={handleCreate}
                            disabled={loading.create}
                        />
                    </Form.Item>
                    <Form.Item label="Sport" required>
                        <Select
                            value={selectedSport}
                            onChange={setSelectedSport}
                            disabled={loading.create}
                        >
                            {sports.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Team A Color">
                        <Input type="color" value={teamAColor} onChange={e => setTeamAColor(e.target.value)} />
                    </Form.Item>
                    <Form.Item label="Team B Color">
                        <Input type="color" value={teamBColor} onChange={e => setTeamBColor(e.target.value)} />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button
                                type="primary"
                                block size="large"
                                onClick={handleCreate}
                                loading={loading.create}
                            >Create Room</Button>
                            <Button
                                block size="large"
                                onClick={() => setMode('join')}
                                disabled={loading.create}
                            >Back to Join</Button>
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
                    onChange={e => setSelectedPlayer(e.target.value)}
                    value={selectedPlayer}
                    style={{ display: 'block', maxHeight: '40vh', overflowY: 'auto' }}
                >
                    {(unlinkedPlayers || []).sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <Radio key={p.id} value={p.id} style={{ display: 'block', margin: '8px 0' }}>{p.name}</Radio>
                    ))}
                </Radio.Group>
                <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                    <Button
                        block
                        onClick={() => handleFinalize(null)}
                        disabled={loading.finalize || selectedPlayer !== null}
                    >Create New Player</Button>
                    <Button
                        type="primary"
                        block
                        onClick={() => handleFinalize(selectedPlayer)}
                        disabled={loading.finalize || !selectedPlayer}
                        loading={loading.finalize}
                    >I'm {(unlinkedPlayers || []).find(p => p.id === selectedPlayer)?.name}</Button>
                </Space>
            </Modal>
        </div>
    );
};

export default CreateOrJoinRoom;
