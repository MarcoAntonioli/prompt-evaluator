import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateAllStatistics } from '../utils/statistics';
import './Statistics.css';

// Helper function to format model display names
const formatModelName = (modelKey) => {
  if (modelKey.startsWith('xai.')) {
    return modelKey.replace('xai.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (modelKey.startsWith('meta.')) {
    return modelKey.replace('meta.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (modelKey.startsWith('cohere.')) {
    return modelKey.replace('cohere.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return modelKey;
};

function Statistics({ modelStates }) {
  // Calculate statistics for all models
  const modelStats = useMemo(() => {
    const stats = {};
    Object.entries(modelStates).forEach(([modelKey, state]) => {
      if (!state.error && state.response && state.totalTime !== null) {
        stats[modelKey] = {
          ...calculateAllStatistics(state.response, state.totalTime),
          timeToFirstToken: state.timeToFirstToken,
          totalTime: state.totalTime,
        };
      }
    });
    return stats;
  }, [modelStates]);

  // Prepare data for charts
  const timeToFirstTokenData = Object.entries(modelStates)
    .filter(([_, state]) => state.timeToFirstToken !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: formatModelName(modelKey),
      time: state.timeToFirstToken * 1000, // Convert to ms, keep as number
    }));

  const totalTimeData = Object.entries(modelStates)
    .filter(([_, state]) => state.totalTime !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: formatModelName(modelKey),
      time: state.totalTime * 1000, // Convert to ms, keep as number
    }));

  const comparisonData = Object.entries(modelStates)
    .filter(([_, state]) => state.timeToFirstToken !== null && state.totalTime !== null && !state.error)
    .map(([modelKey, state]) => ({
      model: formatModelName(modelKey),
      'Time to First Token': state.timeToFirstToken * 1000, // Convert to ms, keep as number
      'Total Time': state.totalTime * 1000, // Convert to ms, keep as number
    }));

  const tokenCountData = Object.entries(modelStats)
    .map(([modelKey, stats]) => ({
      model: formatModelName(modelKey),
      tokens: stats.tokenCount,
    }));

  const emojiCountData = Object.entries(modelStats)
    .map(([modelKey, stats]) => ({
      model: formatModelName(modelKey),
      emojis: stats.emojiCount,
    }));

  const throughputData = Object.entries(modelStats)
    .map(([modelKey, stats]) => ({
      model: formatModelName(modelKey),
      'Chars/sec': stats.throughput,
      'Tokens/sec': parseFloat(stats.tokensPerSecond),
    }));

  const wordCountData = Object.entries(modelStats)
    .map(([modelKey, stats]) => ({
      model: formatModelName(modelKey),
      words: stats.wordCount,
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
                <Tooltip formatter={(value) => `${Math.round(value)} ms`} />
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
                <Tooltip formatter={(value) => `${Math.round(value)} ms`} />
                <Bar dataKey="time" fill="#764ba2" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tokenCountData.length > 0 && (
          <div className="chart-card">
            <h3>Token Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tokenCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="tokens" fill="#f093fb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {emojiCountData.length > 0 && emojiCountData.some(d => d.emojis > 0) && (
          <div className="chart-card">
            <h3>Emoji Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emojiCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Emojis', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="emojis" fill="#4facfe" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {wordCountData.length > 0 && (
          <div className="chart-card">
            <h3>Word Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={wordCountData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Words', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="words" fill="#43e97b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {throughputData.length > 0 && (
          <div className="chart-card full-width">
            <h3>Generation Throughput</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Rate', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Chars/sec" fill="#fa709a" />
                <Bar dataKey="Tokens/sec" fill="#fee140" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {comparisonData.length > 0 && (
          <div className="chart-card full-width">
            <h3>Time Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${Math.round(value)} ms`} />
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
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Time to First Token (ms)</th>
                <th>Total Time (ms)</th>
                <th>Tokens</th>
                <th>Words</th>
                <th>Emojis</th>
                <th>Sentences</th>
                <th>Avg Word Length</th>
                <th>Reading Time (min)</th>
                <th>Chars/sec</th>
                <th>Tokens/sec</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(modelStates)
                .filter(([_, state]) => !state.error)
                .map(([modelKey, state]) => {
                  const stats = modelStats[modelKey] || {};
                  return (
                    <tr key={modelKey}>
                      <td>{formatModelName(modelKey)}</td>
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
                      <td>{stats.tokenCount || '-'}</td>
                      <td>{stats.wordCount || '-'}</td>
                      <td>{stats.emojiCount || '-'}</td>
                      <td>{stats.sentenceCount || '-'}</td>
                      <td>{stats.averageWordLength || '-'}</td>
                      <td>{stats.readingTime || '-'}</td>
                      <td>{stats.throughput || '-'}</td>
                      <td>{stats.tokensPerSecond || '-'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Statistics;

