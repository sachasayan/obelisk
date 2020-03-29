import React, { useContext } from 'react';
import './App.css';
import Button from '@material-ui/core/Button';
import { ConnectionContext, ConnectionService } from './ConnectionContext';

function UserInfo() {
  let socket = useContext(ConnectionContext);
  return socket.user.player ? (
      <p>Hello. You are connected as {socket.user.player}</p>
    ) : (<p>Connecting...</p> );
}

function ModeSelector() {
  let socket = useContext(ConnectionContext);
  let modes = [
    'Billboard',
    'Lightcycles',
    'Munchman',
    'Pong',
    'Pulse',
    'Space',
    'Sunlight',
    'Test   ',
  ];

  return (
    <div>
      {modes.map((m) => (
          <>
            <Button variant="contained" color="primary" onClick={() => {socket.changeMode(m)} }>
              {m}
            </Button>
            <br/>
          </>
      ))}
    </div>


  )

 }

function App() {

    return (
      <ConnectionContext.Provider value={ConnectionService}>
      <div className="App">
        <header className="App-header">
          <UserInfo />
          <ModeSelector />

          <canvas className="whiteboard" ></canvas>
        </header>
      </div>
    </ConnectionContext.Provider>
  );
}

function CanvasController () {

  // window.addEventListener('resize', onResize, false);
  // onResize();

  // canvas = document.getElementsByClassName('whiteboard')[0];
  // context = canvas.getContext('2d');
  // canvas.addEventListener('mousedown', onDown, false);
  // canvas.addEventListener('mouseup', onUp, false);
  // canvas.addEventListener('mouseout', onUp, false);
  // canvas.addEventListener('mousemove', throttle(onMove, 10), false);

  // //Touch support for mobile devices
  // canvas.addEventListener('touchstart', onDown, false);
  // canvas.addEventListener('touchend', onUp, false);
  // canvas.addEventListener('touchcancel', onUp, false);
  // canvas.addEventListener('touchmove', throttle(onMove, 10), false);

  // const draw = () => {
  //   context.clearRect(0, 0, canvas.width, canvas.height);
  //   if (touching) {
  //     context.beginPath();
  //     context.arc(current.x, current.y, 50, 0, 2 * Math.PI);
  //     context.stroke();
  //     context.fill();
  //   } else {
  //     context.textAlign = 'center';
  //     context.font = '45px "Bebas Neue"';
  //     context.fillText("Hello, player " + current.player,  canvas.width / 2,  canvas.height / 2);
  //   }

  // }

  // const onDown = (e) => {
  //   touching = true;
  //   current.x = e.clientX || e.touches[0].clientX;
  //   current.y = e.clientY || e.touches[0].clientY;
  // }

  // const onUp = (e) => {
  //   if (!touching) { return; }
  //   touching = false;
  //   context.clearRect(0, 0, canvas.width, canvas.height);
  //   draw();
  // }

  // const onMove = (e) => {
  //   if (!touching) { return; }
  //   current.x = e.clientX||e.touches[0].clientX;
  //   current.y = e.clientY||e.touches[0].clientY;
  //   var w = canvas.width;
  //   var h = canvas.height;

  //   socket.emit('drawing', {
  //     x: current.x / w,
  //     y: current.y / h,
  //     player: current.player
  //   });
  //   draw();
  // }

  // // limit the number of events per second
  // const throttle = (callback, delay)  => {
  //   var previousCall = new Date().getTime();
  //   return function() {
  //     var time = new Date().getTime();

  //     if ((time - previousCall) >= delay) {
  //       previousCall = time;
  //       callback.apply(null, arguments);
  //     }
  //   };
  // }

  // // make the canvas fill its parent
  // const onResize = () => {
  //   canvas.width = window.innerWidth;
  //   canvas.height = window.innerHeight;
  // }


}



export default App;