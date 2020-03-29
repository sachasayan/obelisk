'use strict';

(function() {

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var context = canvas.getContext('2d');

  var current = {
    x: null,
    y: null,
    player: ''
  };
  var touching = false;

  canvas.addEventListener('mousedown', onDown, false);
  canvas.addEventListener('mouseup', onUp, false);
  canvas.addEventListener('mouseout', onUp, false);
  canvas.addEventListener('mousemove', throttle(onMove, 10), false);

  //Touch support for mobile devices
  canvas.addEventListener('touchstart', onDown, false);
  canvas.addEventListener('touchend', onUp, false);
  canvas.addEventListener('touchcancel', onUp, false);
  canvas.addEventListener('touchmove', throttle(onMove, 10), false);

  socket.on('obelisk', onObeliskEvent);
  socket.on('obeliskAssignUser', onAssignUser);

  window.addEventListener('resize', onResize, false);
  onResize();


  function draw(){
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (touching) {
      context.beginPath();
      context.arc(current.x, current.y, 50, 0, 2 * Math.PI);
      context.stroke();
      context.fill();
    } else {
      context.textAlign = 'center';
      context.font = '45px "Bebas Neue"';
      context.fillText("Hello, player " + current.player,  canvas.width / 2,  canvas.height / 2);
    }

  }

  function onDown(e){
    touching = true;
    current.x = e.clientX || e.touches[0].clientX;
    current.y = e.clientY || e.touches[0].clientY;
  }

  function onUp(e){
    if (!touching) { return; }
    touching = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    draw();
  }

  function onMove(e){
    if (!touching) { return; }
    current.x = e.clientX||e.touches[0].clientX;
    current.y = e.clientY||e.touches[0].clientY;
    var w = canvas.width;
    var h = canvas.height;

    socket.emit('drawing', {
      x: current.x / w,
      y: current.y / h,
      player: current.player
    });
    draw();
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // Used when receiving server data
  function onObeliskEvent(data){
    console.log(data);
  }

  function onAssignUser(data){
    current.player = data
    setTimeout(draw, 3000);
  }




})();
