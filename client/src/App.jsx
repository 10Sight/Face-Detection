import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeLayout from './Layout/HomeLayout';
import Home from './pages/Home';
import HistoryView from './pages/HistoryView';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import NeuralRegistry from './pages/NeuralRegistry';
import ControlCenter from './pages/ControlCenter';
import NeuralSearch from './pages/NeuralSearch';
import IntelligenceReports from './pages/IntelligenceReports';
import RemoteCapture from './pages/RemoteCapture';
import NotFound from './pages/NotFound';

const About = () => <h2 className="text-2xl text-blue-400">About Page</h2>;

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeLayout><ControlCenter /></HomeLayout>} />
        <Route path="/search" element={<HomeLayout><NeuralSearch /></HomeLayout>} />
        <Route path="/dashboard" element={<HomeLayout><AnalyticsDashboard /></HomeLayout>} />
        <Route path="/registry" element={<HomeLayout><NeuralRegistry /></HomeLayout>} />
        <Route path="/history" element={<HomeLayout><HistoryView /></HomeLayout>} />
        <Route path="/reports" element={<HomeLayout><IntelligenceReports /></HomeLayout>} />
        <Route path="/remote-uplink" element={<RemoteCapture />} />
        <Route path="/about" element={<HomeLayout><About /></HomeLayout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
