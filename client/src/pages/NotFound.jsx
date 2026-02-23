import React from 'react';
import Lottie from 'lottie-react';
import { Link } from 'react-router-dom';
import animationData from '../assets/404-animation.json';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <Lottie 
            animationData={animationData} 
            loop={true}
            className="w-full max-w-xl mx-auto"
          />
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-300 mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for seems to have drifted into space. 
          Let's get you back on track.
        </p>
        
        <Link 
          to="/" 
          className="inline-block bg-white text-slate-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
