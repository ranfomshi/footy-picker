import React from 'react';
import { TabBar } from 'antd-mobile';
import { AppOutline, UserOutline, CalendarOutline } from 'antd-mobile-icons';

const BottomNav = ({ activeKey, onChange }) => {
    return (
        <TabBar activeKey={activeKey} onChange={onChange}>
            <TabBar.Item key="players" icon={<UserOutline />} title="Players" />
            <TabBar.Item key="gameweeks" icon={<CalendarOutline />} title="Gameweeks" />
            {/* Add more items if needed */}
        </TabBar>
    );
};

export default BottomNav;
