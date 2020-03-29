import io from 'socket.io-client';
import {createContext}  from 'react';

interface UserInfo {
  x: number | null;
  y: number | null;
  player: number | null;
};

export const ConnectionService = new class {
  user: UserInfo;

  socket = io();

  constructor (){
    this.user = {
      x: null,
      y: null,
      player: null,
    };
  }

  init(){
    this.socket.on('obelisk', this.onObeliskEvent);
    this.socket.on('obeliskAssignUser', this.onAssignUser);


  }

  // Send out requests
  changeMode(mode: string){
    console.log('Changing mode... ', mode);
    this.socket.emit('changeMode', mode);
  }

  // Used when receiving server data
  onObeliskEvent(data: any){
    console.log(data);
  }

  onAssignUser(data: any){
    this.user.player = data
  }

};

export const ConnectionContext = createContext(ConnectionService);

