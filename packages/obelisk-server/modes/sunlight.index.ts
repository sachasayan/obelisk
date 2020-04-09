function init (state){
  let { matrix } = state;
  matrix.clear();
  matrix.afterSync((mat, dt, t) => {
    matrix.clear();

    matrix
      .clear()            // clear the display
      .brightness(100)    // set the panel brightness to 100%
      .fgColor(0xCCDDCC)  // set the active color to blue
      .fill();             // color the entire diplay blue

    setTimeout(() => matrix.sync(), 0);
  });
}

function deactivate() {}

let Sunlight = { init, deactivate };

export { Sunlight };