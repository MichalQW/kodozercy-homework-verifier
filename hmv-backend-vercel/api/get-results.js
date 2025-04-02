const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL,
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

module.exports = async (req, res) => {
    await connectRedis();

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed, only GET is permissible.' });
        return;
    }

    const { userId, taskId } = req.query;

    if (!userId || !taskId) {
        res.status(400).json({ error: 'Both userId and taskId query parameters are required' });
        return;
    }

    const redisPattern = `*-${userId}-${taskId}`;

    try {
        const keys = await redisClient.keys(redisPattern);

        if (keys.length === 0) {
            res.status(404).json({ error: 'No data found for provided userId and taskId' });
            return;
        }

        const data = await redisClient.get(keys[0]);
        const parsedData = JSON.parse(data);

        res.status(200).json({
            status: 'ok',
            key: keys[0],
            data: parsedData
        });
    } catch (err) {
        console.error("Redis retrieval error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
