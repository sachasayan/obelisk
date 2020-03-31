import React, { useState, useEffect } from 'react';
import { IProps } from './types';
import io from 'socket.io-client';

export interface ConnectionState {
  socket: any,
  user: number,
  setUser: any
};

export const ConnectionContext = React.createContext<ConnectionState | undefined>(undefined);

export function ConnectProvider({children}: IProps) {

  const setUser = (u: number)  => {
    console.log('Setting user..', u);
    updateConnection(prevState => {
      return {
        ...prevState,
        user: u
      }
    })
  }

  const connectionState: ConnectionState = {
    socket: undefined,
    user: 4,
    setUser: setUser
  };

  useEffect(() => {
    connectionState.socket = io();
    connectionState.socket.on('obeliskAssignUser', setUser);
    console.log('Listening for user assignment...');
    return () => {
      console.log('Cleaning up listener...');
      connectionState.socket.off('obeleiskAssignUser');
    };
  }, []);

  const [connection, updateConnection] = useState(connectionState);

  return (
    <ConnectionContext.Provider value={connection}>
      {children}
    </ConnectionContext.Provider>
  );
}

// export class ConnectionService {
//   user: UserInfo;

//   socket: any;

//   constructor (){
//     this.user = {
//       x: null,
//       y: null,
//       player: 4,
//     };
//   }

//   initSocket(){
//     this.socket = io();
//     this.socket.on('obelisk', this.onObeliskEvent);
//     this.socket.on('obeliskAssignUser', this.onAssignUser);
//   }

//   // Send out requests
//   changeMode(mode: string){
//     console.log('Changing mode... ', mode);
//     this.socket.emit('changeMode', mode);
//   }

//   // Used when receiving server data
//   onObeliskEvent(data: any){
//     console.log(data);
//   }

//   onAssignUser(data: any){
//     console.log('Assigning user..', data);
//     this.user.player = data;
//   }

// };


