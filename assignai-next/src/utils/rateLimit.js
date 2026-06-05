const rateLimitCache = new Map();

export default function rateLimit({ interval = 60000, uniqueTokenPerInterval = 500 }) {
  return {
    check: (res, limit, token) =>
      new Promise((resolve, reject) => {
        const tokenCount = rateLimitCache.get(token) || [0];
        if (tokenCount[0] === 0) {
          rateLimitCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage >= limit;

        // Set Headers
        if (res?.headers) {
          res.headers.set('X-RateLimit-Limit', limit.toString());
          res.headers.set('X-RateLimit-Remaining', isRateLimited ? '0' : (limit - currentUsage).toString());
        }

        // Clean up cache after interval
        setTimeout(() => {
          const current = rateLimitCache.get(token);
          if (current) {
            current[0] -= 1;
            if (current[0] === 0) {
              rateLimitCache.delete(token);
            }
          }
        }, interval);

        if (isRateLimited) {
          return reject('Rate limit exceeded');
        }

        return resolve();
      }),
  };
}
