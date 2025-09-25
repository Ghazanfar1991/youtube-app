import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="prose prose-invert prose-lg mx-auto text-gray-300">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-8">Privacy Policy for ThumbGenius</h1>
          <p className="text-lg text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-bold mt-12 text-white">1. Introduction</h2>
          <p>Welcome to ThumbGenius ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. By using ThumbGenius, you agree to the collection and use of information in accordance with this policy.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">2. Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
          <ul>
            <li><strong>Personal Data:</strong> When you connect your YouTube account, we collect information provided by Google, such as your name, email address, and profile picture. We do not store your Google password.</li>
            <li><strong>Usage Data:</strong> We automatically collect information about how you use the service, such as the prompts you enter, features you use, and your activity history within the app. This data is used to improve our service.</li>
            <li><strong>Generated Content:</strong> We store the thumbnails you generate and your generation history to provide you with access to them later.</li>
            <li><strong>Local Storage:</strong> We use your browser's local storage to save your settings and history on your device for a better user experience.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 text-white">3. How We Use Your Information</h2>
          <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Provide and improve our AI thumbnail generation services.</li>
            <li>Monitor and analyze usage and trends to improve your experience.</li>
            <li>Respond to your comments and questions and provide customer service.</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 text-white">4. Disclosure of Your Information</h2>
          <p>We do not share, sell, rent, or trade your personal information with third parties for their commercial purposes. We may share information we have collected about you in certain situations, such as:</p>
          <ul>
            <li><strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.</li>
            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-12 text-white">5. Data Security</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">6. Your Rights</h2>
          <p>You have the right to access, update, or delete the information we have on you. You can disconnect your YouTube account at any time through the settings page, which will remove our access to your YouTube data.</p>
          
          <h2 className="text-2xl font-bold mt-12 text-white">7. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@thumbgenius.com.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
