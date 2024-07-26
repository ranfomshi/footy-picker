import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table, Spin } from 'antd';

const PlayerStats = () => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://footy-picker-58753c2f9639.herokuapp.com/api' : 'http://localhost:5000/api';

    const fetchPlayerStats = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/players`);
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
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Ws',
            dataIndex: 'wins',
            key: 'wins',
            sorter: (a, b) => a.wins - b.wins,
            defaultSortOrder: 'descend', // Set default sort order to descending for wins column
        },
        {
            title: 'Ls',
            dataIndex: 'losses',
            key: 'losses',
            sorter: (a, b) => a.losses - b.losses,
        },
        {
            title: 'Ds',
            dataIndex: 'draws',
            key: 'draws',
            sorter: (a, b) => a.draws - b.draws,
        },
        {
            title: 'G+',
            dataIndex: 'goalsFor',
            key: 'goalsFor',
            sorter: (a, b) => a.goalsFor - b.goalsFor,
        },
        {
            title: 'G-',
            dataIndex: 'goalsAgainst',
            key: 'goalsAgainst',
            sorter: (a, b) => a.goalsAgainst - b.goalsAgainst,
        },
    ];
    
    return (
        <div>
            <h2>Player Stats</h2>
            {loading ? (
                <Spin size="large" />
            ) : (
                <Table size='small' dataSource={players} columns={columns} rowKey="id" />
            )}
        </div>
    );
};

export default PlayerStats;
