(function () {
  var sec = new URLSearchParams(location.search).get('sec');
  if (!sec) return;
  document.querySelectorAll('.sec').forEach(function (s) {
    if (s.id !== sec) s.style.display = 'none';
  });
  var hd = document.querySelector('.report-head');
  if (hd) hd.style.display = 'none';
})();
