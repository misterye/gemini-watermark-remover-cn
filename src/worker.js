export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Get password from environment variable
        const APP_PASSWORD = env.APP_PASSWORD;

        // Handle Auth API
        if (url.pathname === '/api/auth') {
            // If APP_PASSWORD is not set, allow access
            if (!APP_PASSWORD) {
                return new Response(JSON.stringify({ success: true, note: 'No password set' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204 });
            }

            if (request.method !== 'POST') {
                return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                const body = await request.json();
                if (body.password === APP_PASSWORD) {
                    return new Response(JSON.stringify({ success: true }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return new Response(JSON.stringify({ success: false, message: 'Invalid password' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: 'Invalid request' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Default: Return static asset
        return env.ASSETS ? await env.ASSETS.fetch(request) : fetch(request);
    }
};
