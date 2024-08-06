import React, { useState } from 'react';
import { Button, message, Modal } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import useStore from '../useStore';
import ScoringGuide from './ScoringGuide';

const AccountManager = () => {
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const [unlinking, setUnlinking] = useState(false);
  const { roomCode, roomName, setHasJoinedRoom } = useStore();
  const [isModalVisible, setIsModalVisible] = useState(false); // State to manage modal visibility

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

  return (
    <div>
      <h2>Account Management</h2>
      <div>
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <Button type='primary' onClick={() => logout({ returnTo: window.location.origin })}>Log out</Button>
        <Button
          type='ghost'
          style={{ color: 'red', position: 'absolute', bottom: 100, right: '50%', transform: 'translateX(50%)' }}
          onClick={handleUnlink}
          loading={unlinking}
        >
          <u>Leave <b>{roomName} <code>{roomCode}</code></b> room</u>
        </Button>
        <Button style={{  position: 'absolute', bottom: 200, right: '50%', transform: 'translateX(50%)' }} type='ghost' onClick={showModal}>View Scoring System</Button>
        <Modal
          title="Scoring System Guide"
          visible={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          width="90%"
          style={{ top: 20 }}
          bodyStyle={{ padding: '20px' }}
          footer={[
            <Button key="close" onClick={handleCancel}>
              Close
            </Button>,
          ]}
        >
          <ScoringGuide />
        </Modal>
      </div>
    </div>
  );
};

export default AccountManager;
