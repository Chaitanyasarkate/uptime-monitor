import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Plus,
  Clock,
  Globe,
  Radio,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { mockMonitors } from './mockData';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formattedTime = new Date(data.checked_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-2xl backdrop-blur-md text-xs">
        <p className="text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {formattedTime}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-300">Latency:</span>
          <span className="font-semibold text-emerald-400">
            {data.response_time_ms > 0 ? `${data.response_time_ms} ms` : 'No response'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-300">Status Code:</span>
          <span
            className={`font-semibold ${
              data.status_code === 200 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {data.status_code || 'Error'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [monitors, setMonitors] = useState(mockMonitors);
  const [newUrl, setNewUrl] = useState('');
  const [inputError, setInputError] = useState('');

  // Top summary stats
  const totalCount = monitors.length;
  const upCount = monitors.filter((m) => m.status === 'UP').length;
  const downCount = monitors.filter((m) => m.status === 'DOWN').length;

  const handleAddMonitor = (e) => {
    e.preventDefault();
    const trimmed = newUrl.trim();
    if (!trimmed) {
      setInputError('Please enter a website URL');
      return;
    }

    // Auto-prepend https:// if missing
    let formattedUrl = trimmed;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Check duplicate
    if (monitors.some((m) => m.url.toLowerCase() === formattedUrl.toLowerCase())) {
      setInputError('This URL is already being monitored');
      return;
    }

    const now = Date.now();
    const newId = Date.now();
    const sampleLatencies = [110, 105, 120, 95, 130, 115, 108, 122, 114, 119, 107, 112];

    const newMonitor = {
      id: newId,
      url: formattedUrl,
      status: 'UP',
      last_checked: new Date(now).toISOString(),
      created_at: new Date(now).toISOString(),
      history: sampleLatencies.map((latency, idx) => {
        const minutesAgo = 11 - idx;
        return {
          id: newId + idx + 1,
          monitor_id: newId,
          status_code: 200,
          response_time_ms: latency,
          is_up: true,
          checked_at: new Date(now - minutesAgo * 60 * 1000).toISOString(),
        };
      }),
    };

    setMonitors([newMonitor, ...monitors]);
    setNewUrl('');
    setInputError('');
  };

  const handleDeleteMonitor = (id) => {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  };

  const calculateAvgResponseTime = (history) => {
    const validPoints = history.filter((h) => h.is_up && h.response_time_ms > 0);
    if (!validPoints.length) return null;
    const sum = validPoints.reduce((acc, curr) => acc + curr.response_time_ms, 0);
    return Math.round(sum / validPoints.length);
  };

  const formatLastChecked = (isoString) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-8">
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                PulseGuard <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-medium">Uptime Monitor</span>
              </h1>
              <p className="text-xs text-slate-400">Live operational status and 24-hour latency tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3.5 py-1.5 rounded-full w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real-time polling active</span>
          </div>
        </header>

        {/* Top Summary Bar */}
        <section aria-label="Overview Metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Monitors */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-slate-700">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Monitors</p>
              <h2 className="text-3xl font-bold text-white mt-1">{totalCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300">
              <Globe className="w-6 h-6" />
            </div>
          </div>

          {/* Operational UP */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-emerald-500/30">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Operational</p>
              <h2 className="text-3xl font-bold text-emerald-400 mt-1">{upCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Down */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-rose-500/30">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-rose-400">Downtime</p>
              <h2 className="text-3xl font-bold text-rose-400 mt-1">{downCount}</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Add Monitor Form */}
        <section className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Add New Service
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Enter a URL to begin monitoring latency and uptime availability.</p>
          </div>
          <form onSubmit={handleAddMonitor} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="example.com or https://api.myservice.io"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              {inputError && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {inputError}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Monitor</span>
            </button>
          </form>
        </section>

        {/* Monitor Cards List */}
        <main className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Active Monitors ({monitors.length})
            </h3>
          </div>

          {monitors.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center">
              <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-[1.5]" />
              <p className="text-slate-300 font-medium">No monitors configured</p>
              <p className="text-xs text-slate-500 mt-1">Add a URL above to start tracking availability.</p>
            </div>
          ) : (
            monitors.map((monitor) => {
              const isUp = monitor.status === 'UP';
              const avgLatency = calculateAvgResponseTime(monitor.history);

              return (
                <div
                  key={monitor.id}
                  className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all duration-200"
                >
                  {/* Top Bar inside Monitor Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                          isUp
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isUp ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        />
                        {isUp ? 'UP' : 'DOWN'}
                      </span>

                      {/* Clickable URL */}
                      <a
                        href={monitor.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-semibold text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group"
                      >
                        <span className="truncate max-w-xs sm:max-w-md">{monitor.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </a>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 block">
                          Last Checked
                        </span>
                        <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {formatLastChecked(monitor.last_checked)}
                        </span>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteMonitor(monitor.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                        title="Delete Monitor"
                        aria-label="Delete Monitor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Metrics & Latency Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Avg Response</span>
                      <span className="text-lg font-bold text-slate-100 mt-0.5 flex items-center gap-1">
                        <Zap className="w-4 h-4 text-amber-400" />
                        {avgLatency !== null ? `${avgLatency} ms` : 'N/A'}
                      </span>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Availability</span>
                      <span
                        className={`text-lg font-bold mt-0.5 ${
                          isUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isUp ? '100%' : '0%'}
                      </span>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Checks Recorded</span>
                      <span className="text-lg font-bold text-slate-100 mt-0.5">
                        {monitor.history.length}
                      </span>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Current Latency</span>
                      <span className="text-lg font-bold text-slate-100 mt-0.5">
                        {monitor.history[monitor.history.length - 1]?.response_time_ms
                          ? `${monitor.history[monitor.history.length - 1].response_time_ms} ms`
                          : isUp
                          ? 'Measuring'
                          : 'Failed'}
                      </span>
                    </div>
                  </div>

                  {/* Recharts LineChart */}
                  <div className="mt-2 pt-2 border-t border-slate-800/40">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-medium text-slate-400">Response Time History (Last 12 checks)</span>
                      <span className="text-[11px] text-slate-500">ms vs. time</span>
                    </div>
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monitor.history} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis
                            dataKey="checked_at"
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            tickFormatter={(val) =>
                              new Date(val).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            }
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'auto']}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="response_time_ms"
                            stroke={isUp ? '#10b981' : '#f43f5e'}
                            strokeWidth={2.5}
                            dot={{
                              r: 3,
                              fill: isUp ? '#10b981' : '#f43f5e',
                              strokeWidth: 1,
                              stroke: '#0f172a',
                            }}
                            activeDot={{
                              r: 5,
                              fill: isUp ? '#34d399' : '#fb7185',
                              stroke: '#0f172a',
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
