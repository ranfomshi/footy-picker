import React, { useState } from 'react';
import { Avatar, Button, Image, message, Modal, Space, Typography } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import useStore from '../useStore';
import ScoringGuide from './ScoringGuide';

const { Title, Text } = Typography;

const AccountManager = () => {
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const [unlinking, setUnlinking] = useState(false);
  const { roomCode, roomName, setHasJoinedRoom } = useStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/unlink-player`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      message.success('Player unlinked successfully');
      setHasJoinedRoom(false);
    } catch (error) {
      console.error('Error unlinking player:', error);
      message.error('Failed to unlink player');
    } finally {
      setUnlinking(false);
      setIsConfirmVisible(false);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const showConfirm = () => {
    setIsConfirmVisible(true);
  };

  const handleConfirmOk = () => {
    handleUnlink();
  };

  const handleConfirmCancel = () => {
    setIsConfirmVisible(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
    
      <Title level={2}>Account Management</Title>  <Image src={user.picture} preview={false} style={{borderRadius:'75px', margin:30, height:150, width:150}}/>
      <div>
        <Text strong>Name:</Text> <Text>{user.name}</Text>
        <br />
        <Text strong>Email:</Text> <Text>{user.email}</Text>
        <Space direction="vertical" style={{ width: '100%', marginTop: '20px' }}>
          <Button block type='primary' onClick={showModal}>View Scoring System</Button>
          <Modal
            title="Scoring System Guide"
            visible={isModalVisible}
            onOk={handleOk}
            onCancel={handleCancel}
            width="90%"
            style={{ top: 20 }}
            footer={[
              <Button key="close" onClick={handleCancel}>
                Close
              </Button>,
            ]}
          >
            <ScoringGuide />
          </Modal>
        </Space>
        <Space direction="vertical" style={{ width: '100%', marginTop: '20%' }}>
          <Button block type='default' onClick={() => logout({ returnTo: window.location.origin })}>Log out</Button>
          
            <Button type='text' block danger onClick={showConfirm}>Leave <b>{roomName} <code>{roomCode}</code></b> room</Button>
         
        </Space>
        <Modal
          title={<>Leave Room <b>{roomName} <code>{roomCode}</code></b>?</>}
          visible={isConfirmVisible}
          onOk={handleConfirmOk}
          onCancel={handleConfirmCancel}
          okText="Yes, Leave"
          cancelText="No"
        >
          <p>Are you sure you want to leave the room? This unlinks your profile from the player but leaves the player in the room so you can still take part in games with your group.</p>
        </Modal>
      </div>
    </div>
  );
};

export default AccountManager;
