enum STATUS {
  INTRO,
  PLAYING_GAME,
  WIN_SCREEN
}


interface Coords {
  x: number;
  y: number;
}

class LightCycle {
  status: 'alive' | 'dead';
  coords: Coords[];
  intent: Coords;
  maxLength: number;
  color: number;
  constructor (
    color: number,
    initialCoords: Coords,
    intentx: number,
    intenty: number
  ) {
    this.status = 'alive';
    this.color = color;
    this.coords = [];
    this.coords.push(initialCoords);
    this.intent = {x: intentx, y: intenty};
    this.maxLength = 20;
  }

  step(): any {
    if (this.intent){
      this.coords.unshift({
          x: this.coords[0].x + this.intent.x,
          y: this.coords[0].y + this.intent.y
        });
      this.coords = this.coords.slice(0, this.maxLength);
    }
  }
}

export {
  STATUS,
  Coords,
  LightCycle
};