export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { password } = req.body;
    const APP_PASSWORD = process.env.APP_PASSWORD;

    // If no password is set in environment, allow access (or you can forbid it)
    if (!APP_PASSWORD) {
        res.status(200).json({ success: true, note: 'No password set' });
        return;
    }

    if (password === APP_PASSWORD) {
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
}
