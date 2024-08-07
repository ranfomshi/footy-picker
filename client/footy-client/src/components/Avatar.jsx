import React from "react";
import { Image } from "antd";
import { useAuth0 } from "@auth0/auth0-react";

const Avatar = () => {
  const { user } = useAuth0();

  return (
    <Image
      src={user.picture}
      preview={false}
      style={{
        borderRadius: "75px",
        height: 40,
        width: 40,
        position: "absolute",
        top: 16,
        left: 16,
      }}
    />
  );
};

export default Avatar;
