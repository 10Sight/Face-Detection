import React from 'react';
import FaceDetection from '../components/FaceDetection/FaceDetection';

const Home = () => {
  return (
    <div className="page-shell">
      <div className="bg-zinc-900/20 rounded-[2.5rem] border border-white/[0.03] min-h-[calc(100vh-140px)] shadow-2xl overflow-hidden">
        <FaceDetection />
      </div>
    </div>
  );
};

export default Home;
