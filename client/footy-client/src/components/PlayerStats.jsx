import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Spin } from 'antd';

const PlayerStats = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPlayerStats = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/players');
            setPlayers(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching player stats", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayerStats();
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Wins',
            dataIndex: 'wins',
            key: 'wins',
        },
        {
            title: 'Losses',
            dataIndex: 'losses',
            key: 'losses',
        },
        {
            title: 'Draws',
            dataIndex: 'draws',
            key: 'draws',
        },
        {
            title: 'Goals For',
            dataIndex: 'goalsFor',
            key: 'goalsFor',
        },
        {
            title: 'Goals Against',
            dataIndex: 'goalsAgainst',
            key: 'goalsAgainst',
        },
    ];

    return (
        <div>
            <h2>Player Stats</h2>
            {loading ? (
                <Spin size="large" />
            ) : (
                <Table dataSource={players} columns={columns} rowKey="id" />
            )}
        </div>
    );
};

export default PlayerStats;
