import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="prose prose-invert prose-lg mx-auto text-gray-300">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl mb-8">Terms of Service</h1>
          <p className="text-lg text-gray-400">Last Updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-bold mt-12 text-white">1. Agreement to Terms</h2>
          <p>By using ThumbGenius ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">2. Use of the Service</h2>
          <p>You may use the Service to generate and edit images ("Thumbnails"). You are responsible for the prompts you provide and for ensuring that your use of the Service complies with all applicable laws and regulations. You agree not to use the Service to create any harmful, abusive, or infringing content.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">3. User Accounts</h2>
          <p>To access certain features, you may need to connect your YouTube account. You are responsible for safeguarding your account and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">4. Intellectual Property</h2>
          <p>You retain ownership of the prompts you submit. Subject to your compliance with these Terms, we grant you full ownership and commercial rights to the Thumbnails you create using the Service on any paid plan. We do not claim any ownership rights over the content you create.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">5. Termination</h2>
          <p>We may terminate or suspend your access to the Service at any time, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">6. Disclaimer of Warranties</h2>
          <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding the operation or availability of the Service or the accuracy of the content generated.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">7. Limitation of Liability</h2>
          <p>In no event shall ThumbGenius, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
          
          <h2 className="text-2xl font-bold mt-12 text-white">8. Changes to Terms</h2>
          <p>We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.</p>

          <h2 className="text-2xl font-bold mt-12 text-white">9. Contact Us</h2>
          <p>If you have any questions about these Terms, please contact us at support@thumbgenius.com.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;