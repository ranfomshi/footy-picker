import React from 'react';
import { TabBar } from 'antd-mobile';
import { UserOutline, CalendarOutline, PieOutline, SetOutline } from 'antd-mobile-icons';
import { useAuth0 } from '@auth0/auth0-react';
import useStore from '../useStore';
import { Button } from 'antd';

const BottomNav = ({ activeKey, onChange }) => {
    const { logout, isAuthenticated, user } = useAuth0();
    const { hasJoinedRoom } = useStore();

    return (isAuthenticated && hasJoinedRoom ?
        <div style={{
            background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            boxShadow: '0 -4px 20px rgba(0, 185, 107, 0.15)',
            overflow: 'hidden'
        }}>
            <TabBar
                style={{
                    zIndex: 9,
                    background: 'transparent',
                    '--adm-color-primary': 'rgba(255,255,255,0.9)',
                    '--adm-color-weak': 'rgba(255,255,255,0.6)',
                    '--adm-color-light': 'rgba(255,255,255,0.3)',
                }}
                activeKey={activeKey}
                onChange={onChange}
            >
                <TabBar.Item
                    key="playerStats"
                    icon={<UserOutline />}
                    title="Players"
                    style={{
                        color: activeKey === 'playerStats' ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: activeKey === 'playerStats' ? 'bold' : 'normal'
                    }}
                />
                <TabBar.Item
                    key="gameweeks"
                    icon={<CalendarOutline />}
                    title="Gameweeks"
                    style={{
                        color: activeKey === 'gameweeks' ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: activeKey === 'gameweeks' ? 'bold' : 'normal'
                    }}
                />
                <TabBar.Item
                    key="account"
                    icon={<SetOutline />}
                    title="Account"
                    style={{
                        color: activeKey === 'account' ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: activeKey === 'account' ? 'bold' : 'normal'
                    }}
                />
            </TabBar>
        </div> :

        isAuthenticated && (
            <div style={{
                background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                padding: '16px',
                boxShadow: '0 -4px 20px rgba(0, 185, 107, 0.15)'
            }}>
                <Button
                    onClick={() => logout({ returnTo: window.location.origin })}
                    block
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        height: '44px'
                    }}
                >
                    Log Out
                </Button>
            </div>
        )
    );
};

export default BottomNav;
