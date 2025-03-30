import React from "react";
import { Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

const Support = () => (
  <div style={{ padding: "20px" }}>
    <Title level={2}>Support</Title>
    <Paragraph>
      If you have any questions, concerns, or require assistance, please contact our support team:
    </Paragraph>
    <Paragraph>
      <ul>
        <li>
          <Text strong>Email:</Text> <a href="mailto:stuart.pecksen@gmail.com">stuart.pecksen@gmail.com</a>
        </li>
        <li>
          <Text strong>Phone:</Text> <a href="tel:07456559350">07456 559350</a>
        </li>
      </ul>
    </Paragraph>
  </div>
);

export default Support;
