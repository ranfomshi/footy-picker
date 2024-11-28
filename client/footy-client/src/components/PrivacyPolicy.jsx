import React from "react";
import { Typography } from "antd";

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicy = () => (
  <div style={{ padding: "20px" }}>
    <Title level={2}>Privacy Policy</Title>
    <Paragraph>
      Effective Date: <Text strong>[Insert Date]</Text>
    </Paragraph>
    <Paragraph>
      At Footy Picker, we prioritize your privacy and are committed to safeguarding your data. This policy outlines how we collect, use, and protect your information.
    </Paragraph>
    <Title level={3}>1. Data Collection</Title>
    <Paragraph>
      We collect the following data:
      <ul>
        <li>
          <Text strong>Authentication Data</Text>: Managed by Auth0, including email and other information required for logging in.
        </li>
        <li>
          <Text strong>Team and Game Data</Text>: Results for teams you are part of. No individual player stats (e.g., goals, assists) are collected.
        </li>
        <li>
          <Text strong>Analytics Data</Text>: Footy Picker uses Mixpanel to analyze app usage, where your email is used as a unique identifier.
        </li>
      </ul>
    </Paragraph>
    <Title level={3}>2. Use of Data</Title>
    <Paragraph>
      The data we collect is used solely for the following purposes:
      <ul>
        <li>Allowing the app to function by managing team results and histories.</li>
        <li>Enhancing user experience through analytics and historical team performance data.</li>
      </ul>
    </Paragraph>
    <Title level={3}>3. Data Sharing</Title>
    <Paragraph>
      We do not share personally identifiable information with third parties. However, anonymized usage data may be analyzed through Mixpanel.
    </Paragraph>
    <Title level={3}>4. Data Security</Title>
    <Paragraph>
      We take appropriate measures to secure your data:
      <ul>
        <li>Data is stored securely on Heroku, including the back-end and database.</li>
        <li>Authentication is handled through Auth0, ensuring industry-standard protection.</li>
      </ul>
    </Paragraph>
    <Title level={3}>5. User Rights</Title>
    <Paragraph>
      You have the following rights regarding your data:
      <ul>
        <li>
          <Text strong>Access and Deletion</Text>: You can delete your player profile from any team or room within the app.
        </li>
        <li>
          <Text strong>Request Data Deletion</Text>: Send a request to stuart.pecksen@gmail.com to delete all associated data, excluding your Auth0 profile, which must be managed directly through Auth0.
        </li>
      </ul>
    </Paragraph>
    <Title level={3}>6. Contact Information</Title>
    <Paragraph>
      For questions or concerns about this privacy policy, please email us at <Text strong>stuart.pecksen@gmail.com</Text>.
    </Paragraph>
  </div>
);

export default PrivacyPolicy;
