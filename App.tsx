import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export default function App() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProtocols();
  }, []);

  const loadProtocols = async () => {
    const response = await axios.get(`${API_URL}/real/protocols`);
    setProtocols(response.data.protocols);
    if (response.data.protocols.length > 0) {
      setSelectedProtocol(response.data.protocols[0].slug);
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/real/protocol/${selectedProtocol}/health`
      );
      setHealthData(response.data);
    } catch (error) {
      alert('Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🛡️ SentinelAI</h1>
        <p className="text-gray-400">Real DeFi Protection</p>
      </header>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Check Protocol Health</h2>
        
        <select
          value={selectedProtocol}
          onChange={(e) => setSelectedProtocol(e.target.value)}
          className="w-full bg-gray-700 rounded px-4 py-2 mb-4"
        >
          {protocols.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} - {p.riskLevel} risk
            </option>
          ))}
        </select>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg w-full"
        >
          {loading ? 'Checking...' : 'Check Health'}
        </button>
      </div>

      {healthData && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Health Report</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Health Score</h3>
              <p className="text-3xl font-bold">{healthData.healthScore}/100</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Confidence</h3>
              <p className="text-3xl font-bold">{healthData.confidence}%</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Trend</h3>
              <p className="text-3xl font-bold">{healthData.trend}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getHealthColor(healthData.healthScore)}`}
                style={{ width: `${healthData.healthScore}%` }}
              ></div>
            </div>
          </div>

          {healthData.riskFactors.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-3">Risk Factors</h3>
              <ul className="space-y-2">
                {healthData.riskFactors.map((risk: string, idx: number) => (
                  <li key={idx} className="bg-red-900/20 border border-red-500/30 rounded px-4 py-2">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}