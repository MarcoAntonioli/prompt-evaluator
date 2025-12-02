import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Statistics.css';

function Statistics({ modelStates }) {
  // Prepare data for charts
  const timeToFirstTokenData = Object.entries(modelStates)
    .filter(([_, state]) => state.timeToFirstToken !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: modelKey.charAt(0).toUpperCase() + modelKey.slice(1),
      time: (state.timeToFirstToken * 1000).toFixed(0), // Convert to ms
    }));

  const totalTimeData = Object.entries(modelStates)
    .filter(([_, state]) => state.totalTime !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: modelKey.charAt(0).toUpperCase() + modelKey.slice(1),
      time: (state.totalTime * 1000).toFixed(0), // Convert to ms
    }));

  const comparisonData = Object.entries(modelStates)
    .filter(([_, state]) => state.timeToFirstToken !== null && state.totalTime !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: modelKey.charAt(0).toUpperCase() + modelKey.slice(1),
      'Time to First Token': (state.timeToFirstToken * 1000).toFixed(0),
      'Total Time': (state.totalTime * 1000).toFixed(0),
    }));

  if (timeToFirstTokenData.length === 0 && totalTimeData.length === 0) {
    return null;
  }

  return (
    <div className="statistics-container">
      <h2>Performance Statistics</h2>
      
      <div className="charts-grid">
        {timeToFirstTokenData.length > 0 && (
          <div className="chart-card">
            <h3>Time to First Token</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeToFirstTokenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="time" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {totalTimeData.length > 0 && (
          <div className="chart-card">
            <h3>Total Generation Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={totalTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="time" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {comparisonData.length > 0 && (
          <div className="chart-card full-width">
            <h3>Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Time to First Token" fill="#667eea" />
                <Bar dataKey="Total Time" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="statistics-table">
        <h3>Detailed Metrics</h3>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Time to First Token (ms)</th>
              <th>Total Time (ms)</th>
              <th>Response Length</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(modelStates)
              .filter(([_, state]) => !state.error)
              .map(([modelKey, state]) => (
                <tr key={modelKey}>
                  <td>{modelKey.charAt(0).toUpperCase() + modelKey.slice(1)}</td>
                  <td>
                    {state.timeToFirstToken !== null
                      ? (state.timeToFirstToken * 1000).toFixed(0)
                      : '-'}
                  </td>
                  <td>
                    {state.totalTime !== null
                      ? (state.totalTime * 1000).toFixed(0)
                      : '-'}
                  </td>
                  <td>{state.response ? state.response.length : '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Statistics;

