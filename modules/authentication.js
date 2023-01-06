function auth(req, res, next) {
    
    if (!req.user) {
        var err = new Error('You are not authenticated!');
        err.status = 403;
        return next(err);
    }
    else {
        next();
    }
}

module.exports = auth;