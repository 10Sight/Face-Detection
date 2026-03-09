import React from 'react';
import FaceDetection from '../components/FaceDetection/FaceDetection';

const Home = () => {
  return (
    <div className="page-shell">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 min-h-[calc(100vh-140px)] shadow-xl overflow-hidden">
        <FaceDetection />
      </div>
    </div>
  );
};

export default Home;
