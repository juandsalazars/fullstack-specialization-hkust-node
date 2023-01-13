const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authenticate = require('../authenticate');
const cors = require('./cors');

const Favorites = require('../models/favorite');
const Dishes = require('../models/dishes');

const favoritesRouter = express.Router();

favoritesRouter.use(bodyParser.json());

// All favorites route

favoritesRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200)})
.get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({user: req.user._id})
    .populate('user')
    .populate('dishes')
    .then((favorites) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(favorites);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {

    let dishes = await Dishes.find({});

    let dishInMenu = false;

    req.body = req.body.map(dish => dish._id);

    for (let favoriteDish of req.body) {
        for (let dish of dishes) {
            if (String(favoriteDish) === String(dish._id)) {
                dishInMenu = true;
                break;
            }
        }
        if (!dishInMenu) {
            err = new Error('Dish ' + favoriteDish + ' not found.');
            err.status = 404;
            return next(err);
        }
    }

    Favorites.findOne({user: req.user._id})
    .then((favorites) => {
        if (favorites != null) {
            let nonRepeatedDishes = [];
            let dishInFavorites = false;

            for (let dish of req.body) {
                for (let favoriteDish of favorites.dishes) {
                    if (String(favoriteDish) === String(dish)) {
                        dishInFavorites = true;
                        break;
                    }
                }
                if (!dishInFavorites) nonRepeatedDishes.push(dish);

                dishInFavorites = false;
            }

            favorites.dishes = favorites.dishes.concat(nonRepeatedDishes);

            favorites.save()
            .then((favorites) => {
                Favorites.findById(favorites._id)
                    .then((favorites) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorites);
                    });
            }, (err) => next(err));
        }
        else {
            Favorites.create({
                user: req.user._id,
                dishes: req.body
            })
            .then((favorites) => {
                console.log('Favorites for user ' + req.user._id + 'created');

                Favorites.findById(favorites._id)
                .then((favorites) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorites);
                });
            }, (err) => next(err));
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites');
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favorites.remove({user: req.user._id})
    .then((resp) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err));
});

// Specific favorite dish route

favoritesRouter.route('/:dishId')
.get(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('GET operation not supported on /favorites/' + req.params.dishId);
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish == null) {
            err = new Error('Dish not found.');
            err.status = 404;
            return next(err);
        }
        else {
            Favorites.findOne({ user: req.user._id })
            .then((favorites) => {
                if (favorites != null) {

                    let dishInFavorites = false;
        
                    for (let i=0; i < favorites.dishes.length; i++) {
                        if (favorites.dishes[i] == req.params.dishId) {
                            dishInFavorites = true;
                        }
                    }
        
                    if (dishInFavorites) {
                        res.statusCode = 403;
                        res.end('Dish already in favorites for user ' + 
                            req.user._id);
                    }
                    else {
                        favorites.dishes = favorites.dishes.concat([req.params.dishId]);
                        favorites.save()
                        .then((favorites) => {
                            Favorites.findById(favorites._id)
                            .then((favorites) => {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.json(favorites);
                            });
                        }, (err) => next(err));
                    }
                }
                else {

                    Favorites.create({
                        user: req.user._id,
                        dishes: [req.params.dishId]
                    })
                    .then((favorites) => {
                        console.log('Favorites for user ' + req.user._id + ' created');
                        
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(favorites);
                    }, (err) => next(err));
                }
            }, (err) => next(err))
            .catch((err) => next(err));
        }
    })
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favorites/' + req.params.dishId);
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {

    Favorites.findOne({user: req.user._id})
    .then((favorites) => {

        if (favorites != null) {

            let dishInFavorites = false;
            let indexOfDish = -1;

            for (let i=0; i < favorites.dishes.length; i++) {
                if (favorites.dishes[i] == req.params.dishId) {
                    dishInFavorites = true;
                    indexOfDish = i;
                }
            }

            if (dishInFavorites){
                favorites.dishes.splice(indexOfDish, 1);
                
                if(favorites.dishes.length == 0) {
                    Favorites.remove({user: req.user._id})
                    .then((resp) => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.json(resp);
                    }, (err) => next(err))
                    .catch((err) => next(err));
                }
                else {
                    favorites.save()
                    .then((favorites) => {
                        Favorites.findById(favorites._id)
                            .then((favorites) => {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.json(favorites);
                            });
                    }, (err) => next(err));
                }
            }
            else {
                err = new Error('Dish ' + req.params.dishId + ' not found in favorites.');
                err.status = 404;
                return next(err);
            }
        } else {
            err = new Error('Favorites for user ' + req.user._id + ' not found.');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
});

module.exports = favoritesRouter;