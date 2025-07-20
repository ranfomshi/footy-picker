import React from "react";
import { Image } from "antd";
import { useAuth0 } from "@auth0/auth0-react";

const Avatar = ({ style = {} }) => {
  const { user } = useAuth0();

  return (
    <Image
      src={user.picture}
      preview={false}
      style={{
        borderRadius: "50%",
        height: 40,
        width: 40,
        border: '2px solid rgba(255,255,255,0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...style,
      }}
    />
  );
};

export default Avatar;
