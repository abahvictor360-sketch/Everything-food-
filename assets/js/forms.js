/* =============================================================================
   The contact, booking and tracking forms. There is no backend, so rather than
   pretend to submit, each one validates and then hands off to a channel the
   kitchen actually reads: email for contact and bookings, WhatsApp for order
   status, since that is where the riders report in.
   ========================================================================== */
(function () {
  'use strict';

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^[+\d][\d\s().-]{6,}$/;

  function field(id) { return document.getElementById(id); }
  function setInvalid(el, bad) { el.setAttribute('aria-invalid', String(bad)); }

  function sayVia(note) {
    return function (message, ok) {
      note.classList.remove('is-on');
      // Let the old note leave before the new one lands, so a repeat submit
      // still reads as a change rather than a static line.
      setTimeout(function () {
        note.textContent = message;
        note.style.color = ok ? '#8BE6B0' : '#F7B7AC';
        note.classList.add('is-on');
      }, 120);
    };
  }

  function focusFirstInvalid(form) {
    var first = form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
  }

  /* ---------------------------------------------------------------- Contact */
  contactForm();
  bookingForm();
  trackingForm();

  function contactForm() {
  var form = document.getElementById('contact-form');
  if (!form) return;

  var note = document.getElementById('cf-note');
  var say = sayVia(note);

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = field('cf-name');
    var email = field('cf-email');
    var phone = field('cf-phone');
    var topic = field('cf-topic');
    var message = field('cf-message');

    var problems = [];
    if (!name.value.trim()) { setInvalid(name, true); problems.push('your name'); }
    else setInvalid(name, false);

    if (!EMAIL.test(email.value.trim())) { setInvalid(email, true); problems.push('a valid email'); }
    else setInvalid(email, false);

    if (message.value.trim().length < 10) { setInvalid(message, true); problems.push('a message'); }
    else setInvalid(message, false);

    if (problems.length) {
      say('Still need ' + problems.join(', ') + '.', false);
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    var body = [
      'Name: ' + name.value.trim(),
      'Email: ' + email.value.trim(),
      phone.value.trim() ? 'Phone: ' + phone.value.trim() : null,
      'About: ' + topic.value,
      '',
      message.value.trim(),
    ].filter(Boolean).join('\n');

    var href = 'mailto:hello@everythingfood.ng'
      + '?subject=' + encodeURIComponent(topic.value + ' — ' + name.value.trim())
      + '&body=' + encodeURIComponent(body);

    window.location.href = href;
    say('Opening your mail app. If nothing happens, WhatsApp works too.', true);
    if (window.EF && window.EF.showToast) window.EF.showToast('Message ready to send');
  });
  }

  /* ---------------------------------------------------------------- Booking */
  function bookingForm() {
    var form = document.getElementById('booking-form');
    if (!form) return;

    var note = document.getElementById('bk-note');
    var say = sayVia(note);

    // Nobody can book yesterday, and we do not take bookings a year out.
    var date = field('bk-date');
    var today = new Date();
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    date.min = iso(today);
    date.max = iso(new Date(today.getTime() + 90 * 864e5));

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = field('bk-name');
      var phone = field('bk-phone');
      var email = field('bk-email');
      var missing = [];

      if (!date.value) { setInvalid(date, true); missing.push('a date'); }
      else setInvalid(date, false);

      if (!field('bk-time').value) { setInvalid(field('bk-time'), true); missing.push('a time'); }
      else setInvalid(field('bk-time'), false);

      if (!name.value.trim()) { setInvalid(name, true); missing.push('a name'); }
      else setInvalid(name, false);

      if (!PHONE.test(phone.value.trim())) { setInvalid(phone, true); missing.push('a phone number'); }
      else setInvalid(phone, false);

      // Email is optional, but a typed one should still be a real address.
      if (email.value.trim() && !EMAIL.test(email.value.trim())) {
        setInvalid(email, true); missing.push('a valid email');
      } else setInvalid(email, false);

      if (missing.length) {
        say('Still need ' + missing.join(', ') + '.', false);
        focusFirstInvalid(form);
        return;
      }

      var people = field('bk-people').value;
      var body = [
        'Table request',
        '',
        'Date: ' + date.value,
        'Time: ' + field('bk-time').value,
        'People: ' + people,
        'Seating: ' + field('bk-seating').value,
        'Name: ' + name.value.trim(),
        'Phone: ' + phone.value.trim(),
        email.value.trim() ? 'Email: ' + email.value.trim() : null,
        field('bk-notes').value.trim() ? '\nNotes: ' + field('bk-notes').value.trim() : null,
      ].filter(function (line) { return line !== null; }).join('\n');

      window.location.href = 'mailto:hello@everythingfood.ng'
        + '?subject=' + encodeURIComponent('Table for ' + people + ' on ' + date.value + ' — ' + name.value.trim())
        + '&body=' + encodeURIComponent(body);

      say('Opening your mail app. We confirm by phone, so keep it handy.', true);
      if (window.EF && window.EF.showToast) window.EF.showToast('Table request ready to send');
    });
  }

  /* --------------------------------------------------------------- Tracking */
  function trackingForm() {
    var form = document.getElementById('track-form');
    if (!form) return;

    var note = document.getElementById('tr-note');
    var say = sayVia(note);
    var REF = /^(EF[-\s]?)?\d{3,6}$/i;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var ref = field('tr-ref');
      var phone = field('tr-phone');
      var raw = ref.value.trim();
      var missing = [];

      if (!REF.test(raw)) {
        setInvalid(ref, true);
        missing.push(raw ? 'a reference like EF-4821' : 'your order reference');
      } else setInvalid(ref, false);

      if (!PHONE.test(phone.value.trim())) { setInvalid(phone, true); missing.push('the phone on the order'); }
      else setInvalid(phone, false);

      if (missing.length) {
        say('Still need ' + missing.join(' and ') + '.', false);
        focusFirstInvalid(form);
        return;
      }

      // Normalise EF4821, ef-4821 and 4821 to one shape before we quote it back.
      var tidy = 'EF-' + raw.replace(/^EF[-\s]?/i, '');

      var message = 'Hello Everything Food, where is order ' + tidy + '? '
        + 'The number on it is ' + phone.value.trim() + '.';

      window.open('https://wa.me/2348012345678?text=' + encodeURIComponent(message), '_blank', 'noopener');
      say('Opened WhatsApp with ' + tidy + '. We reply from the kitchen board.', true);
      if (window.EF && window.EF.showToast) window.EF.showToast('Asking about ' + tidy);
    });
  }
})();
