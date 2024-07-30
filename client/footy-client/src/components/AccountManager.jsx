import React from 'react';
import { Button } from "antd";
import { useAuth0 } from '@auth0/auth0-react';

const AccountManager = () => {
    const { user, logout } = useAuth0();

    return (
        <div>
            <h2>Account Management</h2>
            <div>
                <p>Name: {user.name}</p>
                <p>Email: {user.email}</p>
                <Button type='primary' onClick={() => logout({ returnTo: window.location.origin })}>Log out</Button>
            </div>
        </div>
    );
};

export default AccountManager;
