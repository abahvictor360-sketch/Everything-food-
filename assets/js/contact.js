/* =============================================================================
   Contact form. There is no backend, so rather than pretend to submit, the form
   validates and hands the message to the visitor's mail app with everything
   filled in — they keep a copy and we can reply to a real address.
   ========================================================================== */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var note = document.getElementById('cf-note');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function field(id) { return document.getElementById(id); }

  function setInvalid(el, bad) {
    el.setAttribute('aria-invalid', String(bad));
  }

  function say(message, ok) {
    note.classList.remove('is-on');
    // Let the old note leave before the new one lands, so a repeat submit still
    // reads as a change rather than a static line.
    setTimeout(function () {
      note.textContent = message;
      note.style.color = ok ? '#8BE6B0' : '#F7B7AC';
      note.classList.add('is-on');
    }, 120);
  }

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
})();
