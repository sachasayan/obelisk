import React, { useContext } from 'react';
import {
  Paper,
  Button
}  from '@material-ui/core';

import './Controller.css';


import {
  Link
} from 'react-router-dom';

import { ConnectionContext, ConnectionState } from '../providers/ConnectionContext';


interface ControllerState{
  ctxRef: any
  canvas: any,
  context: any,
  touching: boolean,
  current: {
    x: number,
    y: number
  }
}

class Controller extends React.Component<{},ControllerState>{

  constructor(props: any) {
    super(props);

    this.state = {
      ctxRef: React.createRef(),
      canvas: undefined,
      context: undefined,
      touching: false,
      current: {
        x: 0,
        y: 0
      }
    }
  }

  componentDidMount() {
    let canvas = this.state.ctxRef.current;
    let context = canvas.getContext('2d');

    canvas.width  = 300;
    canvas.height = 300;

    canvas.addEventListener('mousedown', this.onDown, false);
    canvas.addEventListener('mouseup', this.onUp, false);
    canvas.addEventListener('mouseout', this.onUp, false);
    canvas.addEventListener('mousemove', this.onMove, false);
    canvas.addEventListener('touchstart', this.onDown, false);
    canvas.addEventListener('touchend', this.onUp, false);
    canvas.addEventListener('touchcancel', this.onUp, false);
    canvas.addEventListener('touchmove', this.onMove, false);

    this.setState((prev) => ({
      ...prev,
      touching: false,
      canvas: canvas,
      context: context
    }));

    //window.addEventListener('resize', onResize, false);
  }

  onDown = (e: MouseEvent & TouchEvent) => {
    this.setState((prev) => ({
      ...prev,
      touching: true,
      current: {
        x : e.clientX || e.touches[0].clientX,
        y : e.clientY || e.touches[0].clientY
      }
    }));
  }

  onUp = (e: MouseEvent & TouchEvent) => {
    if (!this.state.touching) { return; }

    this.setState((prev) => ({
      ...prev,
      touching: false,
    }));

    this.state.context.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);
    this.draw();
  }

  onMove = (e: MouseEvent & TouchEvent) => {

    if (!this.state.touching) { return; }

    var rect = this.state.canvas.getBoundingClientRect();

    this.setState((prev) => ({
      ...prev,
      current: {
        x : !!e.touches ?  e.touches[0].clientX - rect.left : e.clientX - rect.left,
        y : !!e.touches ?  e.touches[0].clientY - rect.top : e.clientY - rect.top
      }
    }));

    this.draw();

    let connection: ConnectionState | undefined = useContext(ConnectionContext);

    connection?.socket.emit('drawing', {
      x: this.state.current.x / this.state.canvas.width,
      y: this.state.current.y / this.state.canvas.height,
      player: connection?.user
    });

  }

  draw = () => {
    let context = this.state.context;
    let canvas = this.state.canvas;
    this.state.context.clearRect(0, 0, canvas.width, canvas.height);
    if (this.state.touching) {
      context.beginPath();
      context.arc(this.state.current.x, this.state.current.y, 10, 0, 2 * Math.PI);
      context.stroke();
      context.fill();
    } else {
      context.textAlign = 'center';
      context.font = '45px "Bebas Neue"';
      context.fillText("Hello, player ",  context.width / 2,  context.height / 2);
    }

  }

  render (){
    return (
    <>
      <Paper className="Controller-Paper" elevation={3}>
        <canvas ref={this.state.ctxRef} />
      </Paper>
      <Link to="/">
          <Button className="close">Home</Button>
      </Link>
    </>
    )
  }
}

export default Controller;







// // make the canvas fill its parent
// function onResize() {
//   canvas.width = window.innerWidth;
//   canvas.height = window.innerHeight;
// }

