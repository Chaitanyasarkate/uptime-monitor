// 12 points over the last 12 minutes
const now = Date.now();
const getTimestamp = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000).toISOString();

const googleResponseTimes = [94, 112, 88, 125, 99, 104, 118, 137, 91, 96, 110, 102];
const githubResponseTimes = [168, 185, 192, 214, 176, 162, 224, 189, 175, 198, 208, 181];
const downResponseTimes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const mockMonitors = [
  {
    id: 1,
    url: 'https://google.com',
    status: 'UP',
    last_checked: getTimestamp(0),
    created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    history: googleResponseTimes.map((rt, index) => {
      const minutesAgo = 11 - index;
      return {
        id: 100 + index + 1,
        monitor_id: 1,
        status_code: 200,
        response_time_ms: rt,
        is_up: true,
        checked_at: getTimestamp(minutesAgo),
      };
    }),
  },
  {
    id: 2,
    url: 'https://github.com',
    status: 'UP',
    last_checked: getTimestamp(0),
    created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    history: githubResponseTimes.map((rt, index) => {
      const minutesAgo = 11 - index;
      return {
        id: 200 + index + 1,
        monitor_id: 2,
        status_code: 200,
        response_time_ms: rt,
        is_up: true,
        checked_at: getTimestamp(minutesAgo),
      };
    }),
  },
  {
    id: 3,
    url: 'https://httpstat.us/500',
    status: 'DOWN',
    last_checked: getTimestamp(0),
    created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    history: downResponseTimes.map((rt, index) => {
      const minutesAgo = 11 - index;
      return {
        id: 300 + index + 1,
        monitor_id: 3,
        status_code: 500,
        response_time_ms: rt,
        is_up: false,
        checked_at: getTimestamp(minutesAgo),
      };
    }),
  },
];

export default mockMonitors;
