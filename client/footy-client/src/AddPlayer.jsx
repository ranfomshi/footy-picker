import React, { useState } from 'react';
import { Input, Button } from 'antd';
import axios from 'axios';

const AddPlayer = ({ fetchPlayers }) => {
    const [newPlayerName, setNewPlayerName] = useState('');

    const addPlayer = async () => {
        try {
            const response = await axios.post('/api/players', { name: newPlayerName });
            fetchPlayers();
            setNewPlayerName('');
        } catch (error) {
            console.error("Error adding player", error);
        }
    };

    return (
        <div>
            <h2>Add Player</h2>
            <Input
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player Name"
            />
            <Button type="primary" onClick={addPlayer} style={{ marginTop: '10px' }}>
                Add Player
            </Button>
        </div>
    );
};

export default AddPlayer;
