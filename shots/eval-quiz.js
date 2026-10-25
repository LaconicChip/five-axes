(function () {
  window.confirm = function () { return true; };
  document.querySelector('[data-action="start"]').click();
  document.querySelector('#autoBtn').click();
  for (var i = 0; i < 6; i++) {
    var cells = document.querySelectorAll('#scale button');
    cells[(i % 4) + 1].click();
    document.querySelector('#nextBtn').click();
  }
  document.querySelectorAll('#scale button')[3].click();
})();
