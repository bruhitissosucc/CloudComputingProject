const jwt = require('jsonwebtoken');

// Authentication
const authenticateUser = (req, res, next) => {
    // get token from headers (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // get token

    if (!token) {
        return res.status(401).json({ success: false, error: 'error: Token not provided' });
    }

    try {
        // decode token and attach user info to req.user
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
}
        
        // Attach user information to req.user (This line resolves the undefined error)
        req.user = {
            id: decoded.userId,
            role: decoded.role
        };
        
        next(); // Allowed to proceed to the next middleware or route handler
    } catch (error) {
        return res.status(401).json({ success: false, error: 'error: Invalid or expired token' });
    }
};

// Authorization
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Check for authorization information: If the system hasn't loaded req.user yet
        if (!req.user) {
            return res.status(403).json({ success: false, error: 'error: Authorization information not found' });
        }

        // Check if the current role is in the list of allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'error: You are not authorized to perform this action!' });
        }

        next(); // Allowed to proceed to the next middleware or route handler
    };
};

const attachUserIfPresent = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId, role: decoded.role };
    } catch (error) {
        // Token sai/hết hạn trên route tuỳ chọn: coi như khách, không chặn
    }

    next();
};

module.exports = { authenticateUser, authorizeRoles, attachUserIfPresent };