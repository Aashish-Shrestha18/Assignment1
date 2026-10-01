(function () {
  'use strict';

  var form = document.getElementById('complaint-form');
  if (!form) return;

  var MAX_FILES = 5;
  var MAX_SIZE = 5 * 1024 * 1024;
  var TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // Each rule returns an error message, or '' when the value is valid.
  var rules = {
    fullName: function (v) {
      if (!v) return 'Full name is required.';
      if (v.length < 2 || v.length > 80) return 'Name must be 2–80 characters.';
      if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.\- ]*$/.test(v)) return 'Name contains invalid characters.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    phone: function (v) {
      if (!v) return 'Phone number is required.';
      if (!/^\+?[0-9 ()\-.]{10,20}$/.test(v)) return 'Enter a valid phone number.';
      var digits = v.replace(/\D/g, '').length;
      if (digits < 10 || digits > 15) return 'Phone number must contain 10–15 digits.';
      return '';
    },
    vehicleMake: function (v) {
      if (!v) return 'Vehicle make is required.';
      if (v.length < 2 || v.length > 40) return 'Make must be 2–40 characters.';
      return '';
    },
    vehicleModel: function (v) {
      if (!v) return 'Vehicle model is required.';
      if (v.length > 40) return 'Model must be 1–40 characters.';
      return '';
    },
    vin: function (v) {
      if (!v) return 'VIN is required.';
      if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(v)) return 'VIN must be 17 characters (letters and digits, no I, O or Q).';
      return '';
    },
    subject: function (v) {
      if (!v) return 'Subject is required.';
      if (v.length < 5 || v.length > 100) return 'Subject must be 5–100 characters.';
      return '';
    },
    description: function (v) {
      if (!v) return 'Please describe the problem.';
      if (v.length < 20) return 'Add a little more detail (at least 20 characters).';
      if (v.length > 2000) return 'Description must be 2000 characters or fewer.';
      return '';
    },
    images: function (_v, input) {
      var files = input.files;
      if (!files || !files.length) return '';
      if (files.length > MAX_FILES) return 'You can upload up to ' + MAX_FILES + ' images.';
      for (var i = 0; i < files.length; i++) {
        if (TYPES.indexOf(files[i].type) === -1) return '“' + files[i].name + '” is not a JPG, PNG, GIF or WebP image.';
        if (files[i].size > MAX_SIZE) return '“' + files[i].name + '” is larger than 5 MB.';
      }
      return '';
    }
  };

  function validateField(name) {
    var input = form.elements[name];
    var wrapper = input.closest('.field');
    var error = document.getElementById(name + '-error');
    var value = name === 'images' ? '' : input.value.trim();
    var message = rules[name](value, input);

    error.textContent = message;
    wrapper.classList.toggle('invalid', !!message);
    wrapper.classList.toggle('valid', !message && value !== '');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    input.setAttribute('aria-describedby', name + '-error');
    return !message;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    var touched = false;
    input.addEventListener('blur', function () { touched = true; validateField(name); });
    input.addEventListener(name === 'images' ? 'change' : 'input', function () {
      if (touched || name === 'images' || input.closest('.field').classList.contains('invalid')) validateField(name);
    });
  });

  // Live character counter
  var desc = form.elements.description;
  var counter = document.getElementById('char-count');
  function updateCount() { counter.textContent = desc.value.length; }
  desc.addEventListener('input', updateCount);
  updateCount();

  // Uppercase VIN as the user types
  form.elements.vin.addEventListener('input', function (e) {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  form.addEventListener('submit', function (e) {
    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
    });
    if (firstInvalid) {
      e.preventDefault();
      firstInvalid.focus();
    }
  });

  var alertBox = document.getElementById('server-alert');
  if (alertBox) alertBox.focus();
})();
