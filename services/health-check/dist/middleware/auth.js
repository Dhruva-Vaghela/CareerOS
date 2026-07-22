import { UnauthorizedError } from '@careeros/errors';
// Parses user information from request headers
export function parseAuth() {
    return (req, _res, next) => {
        const userIdHeader = req.headers['x-user-id'];
        if (userIdHeader && typeof userIdHeader === 'string') {
            req.user = { id: userIdHeader };
        }
        else {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                // Placeholder check: for demo, treat token as userId
                req.user = { id: token };
            }
        }
        next();
    };
}
// Guards a route, requiring authenticated session
export function requireAuth() {
    return (req, _res, next) => {
        if (!req.user) {
            next(new UnauthorizedError('Missing or invalid authentication credentials'));
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map