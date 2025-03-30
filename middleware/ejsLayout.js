const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

/**
 * Express middleware for EJS layouts
 */
module.exports = (req, res, next) => {
  // Store the original render function
  const originalRender = res.render;

  // Override the render function
  res.render = function(view, options, callback) {
    // Set default options if not provided
    options = options || {};

    // Callback function for rendering
    const done = callback || function(err, str) {
      if (err) return req.next(err);
      res.send(str);
    };

    // Set layout if not explicitly set to false
    options.layout = options.layout !== false ? 'layout' : false;

    if (options.layout) {
      // Render the view as normal
      originalRender.call(this, view, options, function(err, str) {
        if (err) return done(err);

        // Add rendered view to options
        options.body = str;

        // Render the layout
        originalRender.call(res, options.layout, options, done);
      });
    } else {
      // Render without layout
      originalRender.call(this, view, options, done);
    }
  };

  next();
}; 