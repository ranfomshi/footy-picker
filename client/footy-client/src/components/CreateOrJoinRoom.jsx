import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Input, Space, Typography, message, Form, Divider } from 'antd';
import axios from 'axios';
import useStore from '../useStore';

const { Title, Paragraph } = Typography;

const CreateOrJoinRoom = ({ onRoomJoined }) => {
    const { getAccessTokenSilently } = useAuth0();
    const [roomName, setRoomName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [creatingRoomLoading, setCreatingRoomLoading] = useState(false);
    const [joiningRoomLoading, setJoiningRoomLoading] = useState(false);
    const { setRoomCode: setGlobalRoomCode } = useStore();

    const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://footy-picker-58753c2f9639.herokuapp.com/api' : 'http://localhost:5000/api';

    const createRoom = async () => {
        if (!roomName.trim()) {
            message.error("Room name cannot be empty");
            return;
        }

        setCreatingRoomLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(`${API_BASE_URL}/create-room`, { name: roomName }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            message.success(`Room created successfully. Room code: ${response.data.code}`);
            setGlobalRoomCode(response.data.code);
            onRoomJoined();
        } catch (error) {
            console.error('Error creating room:', error);
            message.error("Error creating room");
        } finally {
            setCreatingRoomLoading(false);
        }
    };

    const joinRoom = async () => {
        if (!roomCode.trim()) {
            message.error("Room code cannot be empty");
            return;
        }

        setJoiningRoomLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(`${API_BASE_URL}/join-room`, { code: roomCode }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            message.success('Joined room successfully');
            setGlobalRoomCode(roomCode);
            onRoomJoined();
        } catch (error) {
            console.error('Error joining room:', error);
            message.error("Error joining room");
        } finally {
            setJoiningRoomLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: '0 auto', padding: '20px' }}>
            <Title level={2} style={{ textAlign: 'center' }}>Create or Join a Room</Title>
            <Divider />
            {creatingRoom ? (
                <Form layout="vertical">
                    <Form.Item label="Room Name" required>
                        <Input
                            placeholder="Enter room name"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            disabled={creatingRoomLoading}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" onClick={createRoom} loading={creatingRoomLoading} block>
                                Create Room
                            </Button>
                            <Button onClick={() => setCreatingRoom(false)} disabled={creatingRoomLoading} block>
                                Cancel
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            ) : (
                <Form layout="vertical">
                    <Form.Item label="Room Code" required>
                        <Input
                            placeholder="Enter room code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value)}
                            disabled={joiningRoomLoading}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" onClick={joinRoom} loading={joiningRoomLoading} block>
                                Join Room
                            </Button>
                            <Button onClick={() => setCreatingRoom(true)} disabled={joiningRoomLoading} block>
                                Create New Room
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            )}
            <Divider />
            <Paragraph style={{ textAlign: 'center' }}>
                Join an existing room or create a new one to get started.
            </Paragraph>
        </div>
    );
};

export default CreateOrJoinRoom;
