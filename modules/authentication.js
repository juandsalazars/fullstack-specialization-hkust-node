function auth(req, res, next) {
    
    if (!req.session.user) {
        var err = new Error('You are not authenticated!');
        err.status = 403;
        return next(err);
    }
    else {
        if (req.session.user === 'authenticated') {
            next();
        }
        else {
            var err = new Error('You are not authenticated!');
            
            err.status = 403;
            return next(err);
        }
    }
}

module.exports = auth;