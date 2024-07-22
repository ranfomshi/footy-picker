import React, { useState } from 'react';
import { DatePicker, Checkbox, Button } from 'antd';
import axios from 'axios';

const RecordAvailability = ({ players, fetchPlayers }) => {
    const [date, setDate] = useState(null);
    const [availablePlayers, setAvailablePlayers] = useState([]);

    const recordAvailability = async () => {
        const playerIds = availablePlayers.map(player => player.id);
        try {
            await axios.post('/api/availability', { date, playerIds });
            alert('Availability recorded!');
        } catch (error) {
            console.error("Error recording availability", error);
        }
    };

    return (
        <div>
            <h2>Record Availability</h2>
            <DatePicker onChange={(date, dateString) => setDate(dateString)} />
            <div style={{ marginTop: '10px' }}>
                {players.map(player => (
                    <Checkbox
                        key={player.id}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setAvailablePlayers([...availablePlayers, player]);
                            } else {
                                setAvailablePlayers(availablePlayers.filter(p => p.id !== player.id));
                            }
                        }}
                    >
                        {player.name}
                    </Checkbox>
                ))}
            </div>
            <Button type="primary" onClick={recordAvailability} style={{ marginTop: '10px' }}>
                Record Availability
            </Button>
        </div>
    );
};

export default RecordAvailability;
