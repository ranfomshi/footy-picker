import React, { useState } from 'react';
import { Button, message } from "antd";
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import useStore from '../useStore';

const AccountManager = () => {
    const { user, logout, getAccessTokenSilently } = useAuth0();
    const [unlinking, setUnlinking] = useState(false);
    const {roomCode, roomName} = useStore()

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
            location.reload()
        } catch (error) {
            console.error('Error unlinking player:', error);
            message.error('Failed to unlink player');
        } finally {
            setUnlinking(false);
        }
    };

    return (
        <div>
            <h2>Account Management</h2>
            <div>
                <p>Name: {user.name}</p>
                <p>Email: {user.email}</p>
                <Button type='primary' onClick={() => logout({ returnTo: window.location.origin })}>Log out</Button>
                <Button type='ghost' style={{color:'red', position:'absolute', bottom:100, right:'50%', transform:'translateX(50%)'}} onClick={handleUnlink} loading={unlinking} >
                   <u>Leave <b>{roomName} <code>{roomCode} </code></b>room</u> 
                </Button>
            </div>
        </div>
    );
};

export default AccountManager;
