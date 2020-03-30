
import React  from 'react';



export interface ConnectionState {
  socket: any,
  user: number,
  setUser: any
};

export const ConnectionContext = React.createContext<ConnectionState | undefined>(undefined);



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


