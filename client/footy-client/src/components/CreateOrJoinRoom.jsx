import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Button, Input, Space, Typography, message, Form, Divider, Modal, Radio, Image } from 'antd';
import axios from 'axios';
import useStore from '../useStore';

const { Title, Paragraph } = Typography;

const CreateOrJoinRoom = ({ onRoomJoined }) => {
    const { getAccessTokenSilently, user } = useAuth0();
    const [roomNameLocalState, setRoomNameLocalState] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [creatingRoom, setCreatingRoom] = useState(false);
    const [creatingRoomLoading, setCreatingRoomLoading] = useState(false);
    const [joiningRoomLoading, setJoiningRoomLoading] = useState(false);
    const [unlinkedPlayers, setUnlinkedPlayers] = useState([]);
    const [selectedUnlinkedPlayer, setSelectedUnlinkedPlayer] = useState(null);
    const [isSelectPlayerModalVisible, setIsSelectPlayerModalVisible] = useState(false);
    const { setRoomCode: setGlobalRoomCode, setRoomName } = useStore();

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const createRoom = async () => {
        if (!roomNameLocalState.trim()) {
            message.error("Room name cannot be empty");
            return;
        }

        setCreatingRoomLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const response = await axios.post(`${API_BASE_URL}/create-room`, { name: roomNameLocalState }, {
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
            const response = await axios.post(`${API_BASE_URL}/join-room`, { code: roomCode }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.unlinkedPlayers) {
                setUnlinkedPlayers(response.data.unlinkedPlayers);
                setIsSelectPlayerModalVisible(true);
            } else {
                message.success('Joined room successfully');
                setGlobalRoomCode(roomCode);
                onRoomJoined();
            }
        } catch (error) {
            console.error('Error joining room:', error);
            message.error("Error joining room");
        } finally {
            setJoiningRoomLoading(false);
        }
    };

    const finalizeJoinRoom = async () => {
        setJoiningRoomLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(`${API_BASE_URL}/finalize-join-room`, {
                roomCode,
                playerId: selectedUnlinkedPlayer,
                newPlayerName: null
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            message.success('Joined room successfully');
            setGlobalRoomCode(roomCode);
            onRoomJoined();
        } catch (error) {
            console.error('Error finalizing room join:', error);
            message.error("Error finalizing room join");
        } finally {
            setJoiningRoomLoading(false);
            setIsSelectPlayerModalVisible(false);
        }
    };

    const createAndLinkNewPlayer = async () => {
        setJoiningRoomLoading(true);
        try {
            const token = await getAccessTokenSilently();
            await axios.post(`${API_BASE_URL}/finalize-join-room`, {
                roomCode,
                playerId: null,
                newPlayerName: user.name
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            message.success('Joined room successfully');
            setGlobalRoomCode(roomCode);
            onRoomJoined();
        } catch (error) {
            console.error('Error finalizing room join:', error);
            message.error("Error finalizing room join");
        } finally {
            setJoiningRoomLoading(false);
            setIsSelectPlayerModalVisible(false);
        }
    };

    const handleRadioChange = (e) => {
        if (selectedUnlinkedPlayer === e.target.value) {
            setSelectedUnlinkedPlayer(null);
        } else {
            setSelectedUnlinkedPlayer(e.target.value);
        }
    };

    const getSelectedPlayerName = () => {
        const selectedPlayer = unlinkedPlayers.find(player => player.id === selectedUnlinkedPlayer);
        return selectedPlayer ? selectedPlayer.name : '';
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
                            value={roomNameLocalState}
                            onChange={(e) => { setRoomName(e.target.value); setRoomNameLocalState(e.target.value) }}
                            disabled={creatingRoomLoading}
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Button type="primary" onClick={createRoom} loading={creatingRoomLoading} block>
                                Create Room
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
            <Image width={200} height={200} preview={false} src='fp_logo.png' />
            <Modal
                title="Select or Create Player"
                visible={isSelectPlayerModalVisible}
                onOk={finalizeJoinRoom}
                onCancel={() => setIsSelectPlayerModalVisible(false)}
                confirmLoading={joiningRoomLoading}
                okButtonProps={{ disabled: !selectedUnlinkedPlayer }}
                footer={[
                    <Button key="back" onClick={() => setIsSelectPlayerModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="create"
                        type="primary"
                        onClick={createAndLinkNewPlayer}
                        disabled={joiningRoomLoading}
                    >
                        None of these players is me
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={finalizeJoinRoom}
                        disabled={!selectedUnlinkedPlayer || joiningRoomLoading}
                    >
                        {selectedUnlinkedPlayer ? `I'm ${getSelectedPlayerName()}` : 'OK'}
                    </Button>
                ]}
            >
                <Paragraph>Select your name from the list to retain your historic stats. If you are not listed, add your player at the bottom. </Paragraph>
                <div className='scroll-list' style={{ maxHeight: '40vh' }}>
                    <Radio.Group
                        onChange={handleRadioChange}
                        value={selectedUnlinkedPlayer}
                        style={{ display: 'block', marginBottom: '1em' }}
                    >
                        {unlinkedPlayers.map((player) => (
                            <Radio key={player.id} value={player.id} style={{ display: 'block' }}>
                                {player.name}
                            </Radio>
                        ))}
                    </Radio.Group>
                </div>
            </Modal>
        </div>
    );
};

export default CreateOrJoinRoom;
