const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const {createClient} = require('redis');

const redis = createClient({
    url: process.env.REDIS_URL
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

const client = jwksClient({
    jwksUri: 'https://token.actions.githubusercontent.com/.well-known/jwks'
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        const publicKey = key?.getPublicKey();
        callback(err, publicKey);
    });
}

function verifyGithubOidc(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {audience: 'homework-test-server'}, (err, decoded) => {
            if (err) {
                console.error('JWT verification error:', err);
                return reject(new Error('Token validation failed'));
            }

            if (decoded.iss !== 'https://token.actions.githubusercontent.com') {
                return reject(new Error('Invalid token issuer'));
            }

            resolve(decoded);
        });
    });
}

module.exports = async (req, res) => {
    await connectRedis();

    if (req.method !== 'POST') {
        res.status(405).json({error: 'Method not allowed, only POST is permissible.'});
        return;
    }

    const authorization = req.headers['authorization'];
    if (!authorization) {
        res.status(401).json({error: 'Missing Authorization header'});
        return;
    }

    const token = authorization.replace('Bearer ', '');

    try {
        const payload = await verifyGithubOidc(token);

        const {studentRepository, commitSha, testResult} = req.body;

        if (!studentRepository || !commitSha || !testResult) {
            return res.status(400).json({error: 'Missing required fields'});
        }

        if (payload.repository !== studentRepository) {
            return res.status(400).json({error: 'Mismatch in repository info'});
        }

        const data = {
            github_sub: payload.sub,
            repository: studentRepository,
            commit: commitSha,
            testResult
        };

        const repoParts = studentRepository.split('/');
        const githubUsername = repoParts[3];
        const [userId, taskId] = repoParts[4].split('-');
        const redisKey = `${githubUsername}-${userId}-${taskId}`;

        await redis.set(redisKey, JSON.stringify(data));

        console.log(`Data stored in Redis under key: ${redisKey}`);

        console.dir(data, {depth: null});

        res.json({
            status: 'ok',
            message: 'Result received, verified, and stored in Redis successfully.',
            storedKey: redisKey,
            data
        });
    } catch (err) {
        res.status(401).json({error: err.message});
    }
};