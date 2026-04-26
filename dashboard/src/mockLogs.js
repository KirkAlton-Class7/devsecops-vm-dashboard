// src/mockLogs.js
const TOTAL_LOGS = 2000;          // simulate 2000 log entries
const levels = ['INFO', 'WARN', 'ERROR'];
const sources = ['systemd', 'python3', 'nginx', 'sudo', 'dhclient', 'CRON', 'google_guest_agent', 'kernel'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate logs with descending timestamps (newest first)
const generateMockLogs = () => {
  const logs = [];
  const now = new Date();
  for (let i = 0; i < TOTAL_LOGS; i++) {
    const date = new Date(now.getTime() - i * 1000); // i seconds ago
    const time = date.toLocaleTimeString('en-US', { hour12: false });
    const level = randomItem(levels);
    const source = randomItem(sources);
    let message = '';
    if (level === 'ERROR') message = `Simulated error in ${source}: something went wrong (code ${Math.floor(Math.random() * 1000)})`;
    else if (level === 'WARN') message = `Simulated warning in ${source}: unusual activity detected`;
    else message = `Simulated informational message from ${source}: all good`;
    logs.push({ time, level, source, message });
  }
  return logs;
};

// Pre‑generate logs once
const allLogs = generateMockLogs();

export const getPaginatedMockLogs = (limit = 200, offset = 0) => {
  const start = offset;
  const end = offset + limit;
  const logs = allLogs.slice(start, end);
  const hasMore = end < allLogs.length;
  return { logs, hasMore, offset: end };
};