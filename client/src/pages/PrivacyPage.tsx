import React from 'react';
import { Link } from 'react-router-dom';
import { SeoFor } from '../seo';

// STUB - replaced by the privacy/SEO feature build
const PrivacyPage: React.FC = () => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 p-10 font-mono font-bold">
    <SeoFor path="/privacy" />
    <p className="text-2xl font-black uppercase">Privacy policy</p>
    <Link to="/" className="underline mt-4 inline-block">Home</Link>
  </div>
);

export default PrivacyPage;
