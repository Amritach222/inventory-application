const User = require("./../models/UsersModel");
const Product = require("./../models/ProductModel");
const Order = require("./../models/Order");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

// handle post requests at "api/users/signup"
exports.createUser = [
  // validate our user inputs
  body("username")
    .isLength({
      min: 2
    })
    .withMessage("must be at least 2 charachers")
    .trim()
    .escape(),
  body("password")
    .isLength({
      min: 8
    })
    .withMessage("must be at least 8 characters")
    .trim()
    .escape(),
  body("firstName").isLength({
    min: 2
  }),
  body("lastName")
    .isLength({
      min: 2
    })
    .withMessage("must be at least 2 characters")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("isn't vaild").trim().escape(),

  // continue the proccess after validation
  (req, res) => {
    const errors = validationResult(req);

    // check if the validation passes, if not
    // return a json respond with an error message
    if (!errors.isEmpty()) {
      let field = errors.errors[0].param;
      let message = errors.errors[0].msg;
      let errorMessage = field + " " + message;

      res.status(400).json({
        message: errorMessage,
        errors: errors
      });
    } else {
      // check if the email address is already taken
      // throw a message to the user if so
      User.findOne({ email: req.body.email }, (err, userWithSameEmail) => {
        if (err) {
          res.status(400).json({ message: "Error getting email try gain" });
        } else if (userWithSameEmail) {
          res.status(400).json({ message: "This email is taken" });
        } else {
          // check if the Username is already taken
          // throw a message to the user if so
          User.findOne({ username: req.body.username }, (err, userWithSameUsername) => {
            if (err) {
              res.status(400).json({ message: "Error getting username" });
            } else if (userWithSameUsername) {
              res.status(400).json({ message: "Username is taken" });
            } else {
              // create a new user after validating and sanitzing
              // the user is a customer by default and can update himself to seller
              const newUser = new User({
                username: req.body.username,
                password: req.body.password,
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                isAdmin: false,
                isSeller: false,
                isCustomer: true
              });

              // encrypt the password using bcryptjs
              //create slat and hash
              bcrypt.genSalt(10, (err, salt) => {
                if (err) throw err;

                // hash the password along with our new salt
                bcrypt.hash(newUser.password, salt, (err, hash) => {
                  if (err) throw err;

                  // override the cleartext password in the user with the hashed one
                  newUser.password = hash;

                  // if the email and the username are available, create a new user
                  // with the hashed password
                  newUser
                    .save()
                    .then(user => {
                      // generate and json token and send it with the user
                      jwt.sign(
                        {
                          id: user.id,
                          isAdmin: user.isAdmin,
                          isSeller: user.isSeller,
                          isCustomer: user.isCustomer
                        },
                        config.get("jwtSecret"),
                        { expiresIn: 3600 },
                        (err, token) => {
                          if (err) throw err;
                          res.json({
                            token,
                            message: "Registered Succefully",
                            user: {
                              id: user.id,
                              username: user.username,
                              firstName: user.firstName,
                              lastName: user.lastName,
                              email: user.email,
                              gender: user.gender,
                              nationality: user.nationality,
                              birthDate: user.birthDate,
                              creationDate: user.creationDate,
                              isAdmin: user.isAdmin,
                              isSeller: user.isSeller,
                              isCustomer: user.isCustomer,
                              cart: user.cart,
                              wishList: user.cart
                            }
                          });
                        }
                      );
                    })
                    .catch(err => {
                      res.status(400).json({
                        message: "Error registering",
                        err
                      });
                    });
                });
              });
            }
          });
        }
      });
    }
  }
];

// handle POST request at "api/users/login"
exports.login = [
  // validate our user inputs
  body("username")
    .isLength({
      min: 2
    })
    .withMessage("must be at least 2 charachers")
    .trim()
    .escape(),
  body("password")
    .isLength({
      min: 8
    })
    .withMessage("must be at least 8 characters")
    .trim()
    .escape(),

  (req, res, next) => {
    User.findOne({ username: req.body.username }, (err, user) => {
      if (err) {
        res.json(err);
      }
      if (!user) {
        res.status(400).json({ message: "Invalid username" });
      }
      // compare the encryptic password with the entered password
      else
        bcrypt.compare(req.body.password, user.password).then(isMatch => {
          // if the password doesn't match, return a message
          if (!isMatch) {
            return res.status(400).json({
              message: "Invalid password"
            });
            // if it matches return a json with some data
          } else {
            jwt.sign(
              {
                id: user.id,
                isAdmin: user.isAdmin,
                isSeller: user.isSeller,
                isCustomer: user.isCustomer
              },
              config.get("jwtSecret"),
              { expiresIn: 3600 },
              (err, token) => {
                if (err) res.json({ err });
                else {
                  res.json({
                    token,
                    message: "Logged in Succefully",
                    user: {
                      id: user.id,
                      username: user.username,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                      gender: user.gender,
                      nationality: user.nationality,
                      birthDate: user.birthDate,
                      creationDate: user.creationDate,
                      isAdmin: user.isAdmin,
                      isSeller: user.isSeller,
                      isCustomer: user.isCustomer,
                      cart: user.cart,
                      wishList: user.cart
                    }
                  });
                }
              }
            );
          }
        });
    });
  }
];

// handle get request at "/api/users/user"
exports.getUser = (req, res) => {
  User.findById(req.user.id)
    .select("-password")
    .then(user => res.json(user));
};

// handle PUT at api/users/edit_account to edit user data
exports.editUser = [
  // validate our user inputs
  body("password")
    .isLength({
      min: 8
    })
    .withMessage("must be at least 8 characters")
    .trim()
    .escape(),
  body("firstName")
    .isLength({
      min: 2
    })
    .trim()
    .escape(),
  body("lastName")
    .isLength({
      min: 2
    })
    .withMessage("must be at least 2 characters")
    .trim()
    .escape(),
  body("email").isEmail().withMessage("isn't vaild").trim().escape(),
  body("gender").optional().trim().escape(),
  body("nationality").optional().trim().escape(),
  body("birthDate").optional().trim().escape(),
  body("isSeller").optional().isBoolean().trim().escape(),

  // proceed with the operation
  (req, res) => {
    User.findById(req.user.id, (err, userToUpdate) => {
      if (err) {
        res.status(400).json({ message: "Error getting user try gain" });
      } else {
        //create user with the new data
        let updatedUser = {
          password: req.body.password === "" ? userToUpdate.password : req.body.password,
          firstName: req.body.firstName ? req.body.firstName : userToUpdate.firstName,
          lastName: req.body.lastName ? req.body.lastName : userToUpdate.lastName,
          email: req.body.email ? req.body.email : userToUpdate.email,
          gender: req.body.gender ? req.body.gender : userToUpdate.gender,
          nationality: req.body.nationality
            ? req.body.nationality
            : userToUpdate.nationality,
          birthDate: req.body.birthDate ? req.body.birthDate : userToUpdate.birthDate,
          isSeller: req.body.isSeller ? req.body.isSeller : userToUpdate.isSeller
        };

        // get the old email and check if it's the same as the user provided
        // if it's the same, the user can update the rest of the information
        // if it isn't the same so we check in the database if there's the same email
        // so we don't duplicate 2 users with the same email
        if (userToUpdate.email === req.body.email) {
          // check if the Username is already taken in case we want to edit it
          // throw a message to the user if so
          User.findOne({ username: req.body.username }, (err, userWithSameUsername) => {
            if (err) {
              res.status(400).json({
                message: "Error getting username"
              });
            } else if (userWithSameUsername) {
              res.status(400).json({
                message: "Username is taken"
              });
            } else {
              //check is the 2 passwords match
              if (req.body.password !== req.body.verifyPassword) {
                return res.status(400).json({ message: "Password doesn't match" });
              }
              // generate a hashed password
              bcrypt.genSalt(10, (err, salt) => {
                if (err) throw err;
                // if the user doesn't change the password we keep updating without touching the password
                if (req.body.password === "") {
                  User.findByIdAndUpdate(req.user.id, updatedUser, {
                    new: true,
                    useFindAndModify: false
                  })
                    .select("-password")
                    .then(user => {
                      // in case the user switched the account to a seller account
                      // we need to generate a new token with the new seller auth
                      jwt.sign(
                        {
                          id: user.id,
                          isAdmin: user.isAdmin,
                          isSeller: user.isSeller,
                          isCustomer: user.isCustomer
                        },
                        config.get("jwtSecret"),
                        { expiresIn: 3600 },
                        (err, token) => {
                          if (err) throw err;
                          res.status(200).json({
                            token,
                            message: "Account settings updated",
                            user
                          });
                        }
                      );
                    })
                    .catch(err => {
                      res.status(400).json({
                        message: "Couldn't update",
                        err
                      });
                    });
                  // if the user changes the password we hash the new password
                  // and change its value in the new user object with data
                } else {
                  bcrypt.hash(updatedUser.password, salt, (err, hash) => {
                    if (err) throw err;

                    updatedUser.password = hash;

                    User.findByIdAndUpdate(req.user.id, updatedUser, {
                      new: true,
                      useFindAndModify: false
                    })
                      .select("-password")
                      .then(user => {
                        // in case the user switched the account to a seller account
                        // we need to generate a new token with the new seller auth
                        jwt.sign(
                          {
                            id: user.id,
                            isAdmin: user.isAdmin,
                            isSeller: user.isSeller,
                            isCustomer: user.isCustomer
                          },
                          config.get("jwtSecret"),
                          { expiresIn: 3600 },
                          (err, token) => {
                            if (err) throw err;
                            res.status(200).json({
                              token,
                              message: "Account settings updated",
                              user
                            });
                          }
                        );
                      })
                      .catch(err => {
                        res.status(400).json({
                          message: "Couldn't update",
                          err
                        });
                      });
                  });
                }
              });
            }
          });
        } else {
          //check is the 2 passwords match
          if (req.body.password !== req.body.verifyPassword) {
            return res.status(400).json({ message: "Password doesn't match" });
          }

          // if the email the user provided doesn't match the one in the DB
          // we check if the email address is already taken
          User.findOne({ email: req.body.email }, (err, userWithSameEmail) => {
            if (err) {
              res.status(400).json({
                message: "Error getting email try gain"
              });
            } else if (userWithSameEmail) {
              res.status(400).json({ message: "This email is taken" });
            } else {
              // check if the Username is already taken in case we want to edit it
              // throw a message to the user if so
              User.findOne(
                { username: req.body.username },
                (err, userWithSameUsername) => {
                  if (err) {
                    res.status(400).json({
                      message: "Error getting username"
                    });
                  } else if (userWithSameUsername) {
                    res.status(400).json({ message: "Username is taken" });
                  } else {
                    bcrypt.genSalt(10, (err, salt) => {
                      if (err) throw err;

                      // if the user doesn't change the password we jeep updating without touching the password
                      if (req.body.password === "") {
                        User.findByIdAndUpdate(req.user.id, updatedUser, {
                          new: true,
                          useFindAndModify: false
                        })
                          .select("-password")
                          .then(user => {
                            // in case the user switched the account to a seller account
                            // we need to generate a new token with the new seller auth
                            jwt.sign(
                              {
                                id: user.id,
                                isAdmin: user.isAdmin,
                                isSeller: user.isSeller,
                                isCustomer: user.isCustomer
                              },
                              config.get("jwtSecret"),
                              { expiresIn: 3600 },
                              (err, token) => {
                                if (err) throw err;
                                res.status(200).json({
                                  token,
                                  message: "Account settings updated",
                                  user
                                });
                              }
                            );
                          })
                          .catch(err => {
                            res.status(400).json({
                              message: "Couldn't update",
                              err
                            });
                          });
                        // if the user changes the password we hash the new password
                        // and change its value in the new user object with data
                      } else {
                        bcrypt.hash(updatedUser.password, salt, (err, hash) => {
                          if (err) throw err;

                          updatedUser.password = hash;

                          User.findByIdAndUpdate(req.user.id, updatedUser, {
                            new: true,
                            useFindAndModify: false
                          })
                            .select("-password")
                            .then(user => {
                              // in case the user switched the account to a seller account
                              // we need to generate a new token with the new seller auth
                              jwt.sign(
                                {
                                  id: user.id,
                                  isAdmin: user.isAdmin,
                                  isSeller: user.isSeller,
                                  isCustomer: user.isCustomer
                                },
                                config.get("jwtSecret"),
                                { expiresIn: 3600 },
                                (err, token) => {
                                  if (err) throw err;
                                  res.status(200).json({
                                    token,
                                    message: "Account settings updated",
                                    user
                                  });
                                }
                              );
                            })
                            .catch(err => {
                              res.status(400).json({
                                message: "Couldn't update",
                                err
                              });
                            });
                        });
                      }
                    });
                  }
                }
              );
            }
          });
        }
      }
    });
  }
];

// handle get request at "/api/users/addToWishlist?productId="
exports.addToWishlist = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    let duplicate = false;

    user.wishList.forEach(item => {
      if (item.id == req.query.productId) {
        duplicate = true;
      }
    });

    if (duplicate) {
      res.status(400).json({ message: "You already added this item" });
    } else if (err) res.status(400).json({ message: "Couldn't find Item" });
    else {
      User.findOneAndUpdate(
        { _id: req.user.id },
        {
          $push: {
            wishList: {
              id: req.query.productId,
              date: Date.now()
            }
          }
        },
        { new: true, useFindAndModify: false },
        (err, user) => {
          if (err) return res.json({ message: "couldn't add", err });
          res.status(200).json({ user, message: "Added to your wish list" });
        }
      );
    }
  });
};

// handle GET at api/users/userWishlist
exports.userWishlist = (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      res.status(400).json({ message: "Couldn't get user" }, err);
    } else {
      let wishList = user.wishList;

      let array = wishList.map(item => {
        return item.id;
      });

      Product.find({ _id: { $in: array } })
        .sort({ _id: 1 })
        .exec((err, wishListItems) => {
          if (err) {
            res.status(400).json({ message: "Couldn't get wishlist", err });
          } else {
            res
              .status(200)
              .json({ message: "User wishlist info", wishList, wishListItems });
          }
        });
    }
  });
};

//handle GET at api/users/removeFromWishlist?productId=12313213213
exports.removeFromWishlist = (req, res) => {
  User.findOneAndUpdate(
    { _id: req.user.id },
    { $pull: { wishList: { id: req.query.productId } } },
    { new: true, useFindAndModify: false },
    (err, user) => {
      if (err) {
        res.status(400).json({ message: "Couldn't get wish List", err });
      } else {
        let wishList = user.wishList;
        let array = wishList.map(item => {
          return item.id;
        });

        Product.find({ _id: { $in: array } }).exec((err, wishListItems) => {
          if (err) {
            res.status(400).json({ message: "Couldn't get cart", err });
          } else {
            res
              .status(200)
              .json({ message: "Deleted successfully", wishList, wishListItems });
          }
        });
      }
    }
  );
};

//handle GET at api/users/ordersToDeliver to all seller's orders to be delivered
exports.ordersToDeliver = (req, res) => {
  let userId = req.user.id;

  User.findOne({ _id: userId })
    .populate({
      path: "ordersToDeliver.product",
      model: "Product"
    })
    .exec((err, user) => {
      if (err) res.status(400).json({ message: "Couldn't find user", err });

      res.status(200).json({ user });
    });
};

//handle GET at api/users/ordersToDeliver/markAsShipped to all seller's orders to be delivered
exports.markAsShipped = (req, res) => {
  let userId = req.user.id;

  // first we want to change the item state in the orders
  // so the customer who ordered the product can track
  // the order state
  Order.findOneAndUpdate(
    {
      products: { $elemMatch: { _id: mongoose.Types.ObjectId(req.query.orderId) } }
    },
    { $set: { "products.$.orderState.shipped": true } },
    { new: true, useFindAndModify: false },
    (err, product) => {
      if (err)
        return res
          .status(400)
          .json({ message: "Couldn't mark delivered, try again.", err });
    }
  );

  // then we want to mark the order as delivered
  // in the user ordersToDeliver array
  User.findOneAndUpdate(
    { _id: userId, "ordersToDeliver._id": mongoose.Types.ObjectId(req.query.orderId) },
    { $set: { "ordersToDeliver.$.orderState.shipped": true } },
    { new: true, useFindAndModify: false }
  )
    .populate({
      path: "ordersToDeliver.product",
      model: "Product"
    })
    .exec((err, user) => {
      if (err)
        res.status(400).json({ message: "Couldn't mark delivered, try again.", err });

      res.status(200).json({ message: "Marked as delivered", user });
    });
};