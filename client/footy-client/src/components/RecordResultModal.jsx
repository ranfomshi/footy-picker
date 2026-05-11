import React, { useState } from 'react';
import { Modal, Form, InputNumber, Button, Typography, Row, Col, Select, Divider } from 'antd';
import { TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import PlayerAvatar from './PlayerAvatar';

const { Text } = Typography;
const { Option } = Select;

const RecordResultModal = ({
    visible,
    onClose,
    onSubmit,
    gameweekId,
    teamA = [],
    teamB = [],
    teamAColor = '#1890ff',
    teamBColor = '#f5222d',
    currentUserId // Add this prop to exclude current user
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // Combine both teams for player of the match selection, but exclude current user
    const allPlayers = [...teamA, ...teamB];
    const eligiblePlayers = allPlayers
        .filter(player => {
            // Filter out current user if they have auth0Id matching currentUserId
            return player.auth0Id !== currentUserId;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const resultData = {
                gameweekId,
                teamA_score: values.teamAScore,
                teamB_score: values.teamBScore,
                playerOfTheMatch: values.playerOfTheMatch ? [values.playerOfTheMatch] : []
            };

            await onSubmit(resultData);
            form.resetFields();
            onClose();
        } catch (error) {
            console.error('Error recording result:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#00b96b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <TrophyOutlined style={{ color: 'white', fontSize: 16 }} />
                    </div>
                    <Text strong style={{ fontSize: 16 }}>Record Match Result</Text>
                </div>
            }
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    teamAScore: 0,
                    teamBScore: 0
                }}
            >
                {/* Score Input Section */}
                <div style={{ marginBottom: 24 }}>
                    <Text strong style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
                        Final Score
                    </Text>

                    <Row gutter={24} align="middle">
                        <Col span={10}>
                            <div style={{
                                textAlign: 'center',
                                padding: 16,
                                border: `2px solid ${teamAColor}30`,
                                borderRadius: 12,
                                background: `${teamAColor}08`
                            }}>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: teamAColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 8px'
                                    }}>
                                        <TeamOutlined style={{ color: 'white', fontSize: 14 }} />
                                    </div>
                                    <Text strong style={{ color: teamAColor }}>Team A</Text>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {teamA.length} players
                                    </div>
                                </div>
                                <Form.Item name="teamAScore" style={{ marginBottom: 0 }}>
                                    <InputNumber
                                        min={0}
                                        max={99}
                                        size="large"
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            fontSize: 24,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </Form.Item>
                            </div>
                        </Col>

                        <Col span={4} style={{ textAlign: 'center' }}>
                            <Text strong style={{ fontSize: 20, color: '#6b7280' }}>VS</Text>
                        </Col>

                        <Col span={10}>
                            <div style={{
                                textAlign: 'center',
                                padding: 16,
                                border: `2px solid ${teamBColor}30`,
                                borderRadius: 12,
                                background: `${teamBColor}08`
                            }}>
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        background: teamBColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 8px'
                                    }}>
                                        <TeamOutlined style={{ color: 'white', fontSize: 14 }} />
                                    </div>
                                    <Text strong style={{ color: teamBColor }}>Team B</Text>
                                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                                        {teamB.length} players
                                    </div>
                                </div>
                                <Form.Item name="teamBScore" style={{ marginBottom: 0 }}>
                                    <InputNumber
                                        min={0}
                                        max={99}
                                        size="large"
                                        style={{
                                            width: '100%',
                                            textAlign: 'center',
                                            fontSize: 24,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </Form.Item>
                            </div>
                        </Col>
                    </Row>
                </div>

                <Divider />

                {/* Player of the Match Selection */}
                <div style={{ marginBottom: 24 }}>
                    <Form.Item
                        name="playerOfTheMatch"
                        label={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrophyOutlined style={{ color: '#faad14' }} />
                                <Text strong>Player of the Match (Optional)</Text>
                            </div>
                        }
                    >
                        <Select
                            placeholder="Select player of the match..."
                            size="large"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {eligiblePlayers.map(player => (
                                <Option key={player.id} value={player.name} label={player.name}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <PlayerAvatar player={player} size={24} />
                                        <span>{player.name}</span>
                                        <span style={{
                                            fontSize: 12,
                                            color: '#6b7280',
                                            marginLeft: 'auto'
                                        }}>
                                            {teamA.find(p => p.id === player.id) ? 'Team A' : 'Team B'}
                                        </span>
                                    </div>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <Button onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        style={{
                            backgroundColor: '#00b96b',
                            borderColor: '#00b96b'
                        }}
                    >
                        Record Result
                    </Button>
                </div>
            </Form>
        </Modal>
    );
};

export default RecordResultModal;
