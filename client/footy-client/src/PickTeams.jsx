import React, { useState } from 'react';
import { DatePicker, Button } from 'antd';
import axios from 'axios';

const PickTeams = () => {
    const [date, setDate] = useState(null);
    const [teams, setTeams] = useState({ teamA: [], teamB: [] });

    const pickTeams = async () => {
        try {
            const response = await axios.get('/api/pick-teams', { params: { date } });
            setTeams(response.data);
        } catch (error) {
            console.error("Error picking teams", error);
        }
    };

    return (
        <div>
            <h2>Pick Teams</h2>
            <DatePicker onChange={(date, dateString) => setDate(dateString)} />
            <Button type="primary" onClick={pickTeams} style={{ marginTop: '10px' }}>
                Pick Teams
            </Button>
            <div style={{ marginTop: '10px' }}>
                <h3>Team A</h3>
                {teams.teamA.map(player => <div key={player.id}>{player.name}</div>)}
                <h3>Team B</h3>
                {teams.teamB.map(player => <div key={player.id}>{player.name}</div>)}
            </div>
        </div>
    );
};

export default PickTeams;
