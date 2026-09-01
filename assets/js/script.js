(function () {
  'use strict';

  var navToggle = document.getElementById('navToggle');
  var mobileMenu = document.getElementById('mobileMenu');

  navToggle.addEventListener('click', function () {
    var isOpen = mobileMenu.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navToggle.textContent = isOpen ? '✕' : '☰';
  });

  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.textContent = '☰';
    });
  });

  document.querySelectorAll('.btn-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!target) return;
      var text = target.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          var original = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = original; }, 1500);
        });
      }
    });
  });
})();
