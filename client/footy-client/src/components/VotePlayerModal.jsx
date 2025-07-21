import React, { useState } from 'react';
import { Modal, Select, Button, Typography, Row, Col, Divider } from 'antd';
import { TrophyTwoTone } from '@ant-design/icons';
import PlayerAvatar from './PlayerAvatar';

const { Text } = Typography;
const { Option } = Select;

const VotePlayerModal = ({
    visible,
    onClose,
    onVote,
    gameweekId,
    teamA = [],
    teamB = [],
    currentUserId // Pass this to exclude current user from voting
}) => {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [loading, setLoading] = useState(false);

    // Combine both teams and filter out current user (similar to Dart implementation)
    const allPlayers = [...teamA, ...teamB];
    const eligiblePlayers = allPlayers
        .filter(player => {
            // Filter out current user if they have auth0Id matching currentUserId
            return player.auth0Id !== currentUserId;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleVote = async () => {
        if (!selectedPlayer) return;

        setLoading(true);
        try {
            await onVote(gameweekId, selectedPlayer);
            // Only close and reset if vote was successful
            setSelectedPlayer(null);
            onClose();
        } catch (error) {
            console.error('Error voting:', error);
            // Don't close modal on error - let user try again
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedPlayer(null);
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
                        <TrophyTwoTone twoToneColor={["#ffffff", "#ffffff"]} style={{ fontSize: 16 }} />
                    </div>
                    <Text strong style={{ fontSize: 16 }}>Vote for Player of the Match</Text>
                </div>
            }
            open={visible}
            onCancel={handleClose}
            footer={[
                <Button key="cancel" onClick={handleClose}>
                    Cancel
                </Button>,
                <Button
                    key="vote"
                    type="primary"
                    onClick={handleVote}
                    disabled={!selectedPlayer}
                    loading={loading}
                    style={{
                        backgroundColor: selectedPlayer ? '#00b96b' : undefined,
                        borderColor: selectedPlayer ? '#00b96b' : undefined
                    }}
                >
                    Vote
                </Button>
            ]}
            width={500}
        >
            {eligiblePlayers.length > 0 ? (
                <div>
                    <Text style={{ marginBottom: 16, display: 'block', color: '#6b7280' }}>
                        Select the player who performed best in this match:
                    </Text>

                    <Select
                        value={selectedPlayer}
                        onChange={setSelectedPlayer}
                        placeholder="Choose a player..."
                        style={{ width: '100%', marginBottom: 24 }}
                        size="large"
                        showSearch
                        filterOption={(input, option) =>
                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        {eligiblePlayers.map(player => (
                            <Option key={player.id} value={player.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <PlayerAvatar player={player} size={24} />
                                    <span>{player.name}</span>
                                </div>
                            </Option>
                        ))}
                    </Select>

                    {/* Show team breakdown for context */}
                    <div>
                        <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>
                            Match Teams:
                        </Text>
                        <Row gutter={16}>
                            <Col span={12}>
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: 12,
                                    background: '#fafbfc'
                                }}>
                                    <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                                        Team A ({teamA.length})
                                    </Text>
                                    {teamA.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                                        <div key={player.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginBottom: 4,
                                            fontSize: 12
                                        }}>
                                            <PlayerAvatar player={player} size={16} />
                                            <span>{player.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: 12,
                                    background: '#fafbfc'
                                }}>
                                    <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                                        Team B ({teamB.length})
                                    </Text>
                                    {teamB.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                                        <div key={player.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            marginBottom: 4,
                                            fontSize: 12
                                        }}>
                                            <PlayerAvatar player={player} size={16} />
                                            <span>{player.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        </Row>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <TrophyTwoTone style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                        No eligible players available to vote for.
                    </Text>
                </div>
            )}
        </Modal>
    );
};

export default VotePlayerModal;
