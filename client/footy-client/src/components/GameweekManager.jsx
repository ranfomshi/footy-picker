import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { List, Switch, Button, DatePicker, message, Popconfirm, Collapse, Input, Form, Modal } from 'antd';
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons';

const { Panel } = Collapse;

const GameweekManager = () => {
    const [gameweeks, setGameweeks] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState({});
    const [availability, setAvailability] = useState({});
    const [assignments, setAssignments] = useState({});
    const [form] = Form.useForm();
    const [isAddGameweekModalVisible, setIsAddGameweekModalVisible] = useState(false);
    const [isResultModalVisible, setIsResultModalVisible] = useState(false);
    const [resultGameweekId, setResultGameweekId] = useState(null);
    const [recordedResults, setRecordedResults] = useState({});
    const [searchTerm, setSearchTerm] = useState('');

    const API_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://footy-picker-58753c2f9639.herokuapp.com/api' : 'http://localhost:5000/api';

    const fetchGameweeks = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/gameweeks`);
            const gameweeksData = response.data.reduce((acc, gameweek) => {
                acc[gameweek.id] = gameweek;
                return acc;
            }, {});
            setGameweeks(gameweeksData);
        } catch (error) {
            console.error("Error fetching gameweeks", error);
        }
    };

    const fetchPlayers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/players`);
            setPlayers(response.data);
        } catch (error) {
            console.error("Error fetching players", error);
        }
    };

    const fetchTeams = async (gameweekId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/teamassignments?gameweekId=${gameweekId}`);
            const teamA = [];
            const teamB = [];
            response.data.forEach(assignment => {
                if (assignment.team === 'A') {
                    teamA.push(players.find(player => player.id === assignment.playerId));
                } else {
                    teamB.push(players.find(player => player.id === assignment.playerId));
                }
            });
            setTeams(prevTeams => ({ ...prevTeams, [gameweekId]: { teamA, teamB } }));
        } catch (error) {
            console.error("Error fetching teams", error);
        }
    };

    const fetchAssignments = async (gameweekId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/teamassignments?gameweekId=${gameweekId}`);
            const assignmentData = response.data.reduce((acc, assignment) => {
                acc[assignment.playerId] = assignment.team;
                return acc;
            }, {});
            setAssignments(prevAssignments => ({ ...prevAssignments, [gameweekId]: assignmentData }));
        } catch (error) {
            console.error("Error fetching assignments", error);
        }
    };

    const fetchAvailability = async (gameweekId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/availability?gameweekId=${gameweekId}`);
            const availabilityData = response.data.reduce((acc, availability) => {
                acc[availability.playerId] = availability.status;
                return acc;
            }, {});
            setAvailability(prevAvailability => ({ ...prevAvailability, [gameweekId]: availabilityData }));
        } catch (error) {
            console.error("Error fetching availability", error);
        }
    };

    const fetchRecordedResults = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/gameresults`);
            const resultData = response.data.reduce((acc, result) => {
                acc[result.gameweekId] = result;
                return acc;
            }, {});
            setRecordedResults(resultData);
        } catch (error) {
            console.error("Error fetching recorded results", error);
        }
    };

    const showAddGameweekModal = () => {
        setIsAddGameweekModalVisible(true);
    };

    const handleAddGameweek = async () => {
        if (!selectedDate) {
            message.error("Please select a date for the gameweek.");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/gameweeks`, { date: selectedDate });
            fetchGameweeks();
            setSelectedDate(null);
            setIsAddGameweekModalVisible(false);
        } catch (error) {
            console.error("Error adding gameweek", error);
        }
    };

    const setPlayerAvailability = async (playerId, gameweekId, status) => {
        try {
            await axios.post(`${API_BASE_URL}/availability`, { gameweekId, playerIds: [playerId], status });
            setAvailability(prevAvailability => ({
                ...prevAvailability,
                [gameweekId]: { ...prevAvailability[gameweekId], [playerId]: status }
            }));
            handleTeamAssignment(gameweekId);
        } catch (error) {
            console.error("Error setting availability", error);
        }
    };

    const removePlayerAvailability = async (playerId, gameweekId) => {
        try {
            await axios.post(`${API_BASE_URL}/availability`, { gameweekId, playerIds: [playerId], status: false });
            setAvailability(prevAvailability => ({
                ...prevAvailability,
                [gameweekId]: { ...prevAvailability[gameweekId], [playerId]: false }
            }));
            handleTeamAssignment(gameweekId);
        } catch (error) {
            console.error("Error removing availability", error);
        }
    };

    const deleteGameweek = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/gameweeks/${id}`);
            fetchGameweeks();
        } catch (error) {
            console.error("Error deleting gameweek", error);
        }
    };

    const handleTeamAssignment = async (gameweekId) => {
        try {
            await axios.get(`${API_BASE_URL}/pick-teams?gameweekId=${gameweekId}`);
            message.success('Teams assigned successfully');
            fetchTeams(gameweekId);
            fetchAssignments(gameweekId);
        } catch (error) {
            console.error("Error picking teams", error);
            message.error('Error picking teams');
        }
    };

    const handleGameResult = async (values) => {
        try {
            await axios.post(`${API_BASE_URL}/gameresults`, values);
            message.success('Game result recorded successfully');
            setIsResultModalVisible(false);
            form.resetFields();
            fetchGameweeks();
            fetchRecordedResults();
        } catch (error) {
            console.error("Error recording game result", error);
            message.error(error.response?.data?.error || 'Error recording game result');
        }
    };

    const showResultModal = (gameweekId) => {
        setResultGameweekId(gameweekId);
        form.setFieldsValue({ gameweekId });
        setIsResultModalVisible(true);
    };

    const handleCancel = () => {
        setIsAddGameweekModalVisible(false);
        setIsResultModalVisible(false);
        form.resetFields();
    };

    const filteredPlayers = players.filter(player => 
        (!availability[resultGameweekId] || !availability[resultGameweekId][player.id]) && 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        fetchGameweeks();
        fetchPlayers();
        fetchRecordedResults();
    }, []);

    return (
        <div>
            <Button size='small' type="primary" onClick={showAddGameweekModal}>Add Gameweek</Button>
            <List
                className='scroll-list'
                itemLayout="horizontal"
                dataSource={Object.values(gameweeks)}
                renderItem={gameweek => {
                    const resultExists = !!recordedResults[gameweek.id];
                    const result = recordedResults[gameweek.id];
                    return (
                        <List.Item style={{ width: '100%' }}>
                            <Collapse
                                style={{ width: '100%' }}
                                onChange={() => {
                                    fetchAvailability(gameweek.id);
                                    fetchAssignments(gameweek.id);
                                    fetchTeams(gameweek.id);
                                }}
                            >
                                <Panel 
                                    header={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span>{`${new Date(gameweek.date).toLocaleDateString('en-GB')}`}</span>
                                            {resultExists && (
                                                <span style={{display:'flex', alignItems:'baseline'}}>
                                                    Team A  <div style={{background:'#1677ff', borderRadius:'3', color:'white', margin:'0 5px 0 5px', padding:'0 5px 0 5px', width:50}}><strong>{result.teamA_score}</strong> - <strong>{result.teamB_score}</strong></div>  Team B
                                                </span>
                                            )}
                                        </div>
                                    } 
                                    key={gameweek.id}
                                >
                                    {!resultExists && (
                                        <div>
                                            <Input.Search 
                                                placeholder="Search players" 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                style={{ marginBottom: 8 }}
                                            />
                                            <div className='scroll-list' style={{ maxHeight: '200px', overflowY: 'scroll' }}>
                                                {filteredPlayers.map(player => (
                                                    <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span>{player.name}</span>
                                                        <Switch
                                                            checkedChildren="In"
                                                            unCheckedChildren="Out"
                                                            checked={availability[gameweek.id] && availability[gameweek.id][player.id]}
                                                            onChange={(checked) => setPlayerAvailability(player.id, gameweek.id, checked)}
                                                            disabled={resultExists}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {resultExists && (
                                        <Collapse size='small' style={{margin:0, border:'none', padding:0, fontSize:'smaller'}}>
                                            <Panel header="Show players who did not play this match" key="1">
                                                <div>
                                                    {players.filter(player => !availability[gameweek.id] || !availability[gameweek.id][player.id]).map(player => (
                                                        <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <span>{player.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </Panel>
                                        </Collapse>
                                    )}
                                    {teams[gameweek.id] && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                                            <div style={{ flex: 1, marginRight: 16 }}>
                                                <h3>Team A</h3>
                                                <ul style={{ margin: 0, padding: 0 }}>
                                                    {teams[gameweek.id].teamA.map(player => (
                                                        <li style={{ listStyle: 'none', display: 'flex', justifyContent: 'space-between' }} key={player.id}>
                                                            {player.name}
                                                            {!resultExists && <CloseOutlined onClick={() => removePlayerAvailability(player.id, gameweek.id)} style={{ marginLeft: 8, color: 'red' }} />}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3>Team B</h3>
                                                <ul style={{ margin: 0, padding: 0 }}>
                                                    {teams[gameweek.id].teamB.map(player => (
                                                        <li style={{ listStyle: 'none', display: 'flex', justifyContent: 'space-between' }} key={player.id}>
                                                            {player.name}
                                                           {!resultExists && <CloseOutlined onClick={() => removePlayerAvailability(player.id, gameweek.id)} style={{ marginLeft: 8, color: 'red' }} />}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                                        <Popconfirm
                                            title="Are you sure you want to delete this gameweek?"
                                            onConfirm={() => deleteGameweek(gameweek.id)}
                                            okText="Yes"
                                            cancelText="No"
                                            disabled={resultExists}
                                        >
                                            <Button size='small' type="primary" danger disabled={resultExists}><DeleteOutlined /></Button>
                                        </Popconfirm>
                                        <Button size='small' type="primary" onClick={() => showResultModal(gameweek.id)} disabled={resultExists}>
                                            {resultExists ? 'Result Recorded' : 'Record Game Result'}
                                        </Button>
                                    </div>
                                </Panel>
                            </Collapse>
                        </List.Item>
                    );
                }}
            />
            <Modal
                title="Add Gameweek"
                visible={isAddGameweekModalVisible}
                onOk={handleAddGameweek}
                onCancel={handleCancel}
                okText="Add"
                cancelText="Cancel"
            >
                <DatePicker onChange={(date, dateString) => setSelectedDate(dateString)} />
            </Modal>
            <Modal
                title="Record Game Result"
                visible={isResultModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="cancel" onClick={handleCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()}>Submit</Button>
                ]}
            >
                <Form
                    form={form}
                    onFinish={handleGameResult}
                >
                    <Form.Item name="gameweekId" hidden>
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="teamA_score"
                        label="Team A Score"
                        rules={[{ required: true, message: 'Please enter the score for Team A' }]}
                    >
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item
                        name="teamB_score"
                        label="Team B Score"
                        rules={[{ required: true, message: 'Please enter the score for Team B' }]}
                    >
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GameweekManager;
