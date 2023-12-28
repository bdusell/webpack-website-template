import $ from 'jquery';

function initToggle($menu, $button, className) {

  const $both = $menu.add($button);

  function stopPropagationHandler(event) {
    event.stopPropagation();
  }

  function outsideClickHandler() {
    $menu.removeClass(className);
    $both.off('click', stopPropagationHandler);
    $(document).off('click', outsideClickHandler);
  }

  $button.click(function(event) {
    event.stopPropagation();
    $menu.toggleClass(className);
    if($menu.hasClass(className)) {
      $both.on('click', stopPropagationHandler);
      $(document).on('click', outsideClickHandler);
    }
  });
}

$(function() {
  initToggle($('#tga-side-menu'), $('#tga-side-menu-button'), 'x-open');
});
