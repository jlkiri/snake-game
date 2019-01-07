const canvas = document.querySelector("canvas");
const cx = canvas.getContext("2d");
const ROWS = 30, COLS = 30;
const SCALE_X = Math.round(canvas.width / COLS);
const SCALE_Y = Math.round(canvas.height / ROWS);
const UP = [0, -1], DOWN = [0, 1], RIGHT = [1, 0], LEFT = [-1, 0];

const x = c => c * SCALE_X;
const y = c => c * SCALE_Y;

const pipe = (...fns) => x => fns.reduce((y, f) => f(y), x);
const compose = (...fns) => x => fns.reduceRight((y, f) => f(y), x);
const lastInArray = arr => arr[arr.length - 1];
const getRandomFrom = num => Math.floor(Math.round(Math.random() * num));

const move = ([dx, dy]) => ([cx, cy]) => ([cx + x(dx) , cy + y(dy)]);

const createFood = () => {
  const rx = compose(x, getRandomFrom)(COLS);
  const ry = compose(y, getRandomFrom)(ROWS);
  return normalize([rx, ry]);
}

const sameOrOpposite = ([cx, cy]) => ([nx, ny]) => {
  return (cx === nx && cy === ny) || (cx + nx === 0 || cy + ny === 0 )
    ? [cx, cy]
    : [nx, ny];
}

const sameCoord = ([x1, y1]) => ([x2, y2]) => x1 === x2 && y1 === y2;
const checkForCollision = pos => ([x, y]) => pos.some(([px, py]) => px === x && py === y );

const nextSnake = currentPos => food => moveFn => {
  const nextHead = pipe(lastInArray, moveFn, normalize)(currentPos);
  const didCollide = checkForCollision(currentPos)(nextHead);
  const didEatFood = sameCoord(nextHead)(food);
  const [, ...pos] = didEatFood ? [, ...currentPos, nextHead] : [...currentPos, nextHead];
  return { pos, didCollide, didEatFood };
}

const normalize = ([x, y]) => {
  const nx = (x >= canvas.width)
   ? 0
   : x + SCALE_X <= 0
   ? canvas.width - SCALE_X
   : x;
  const ny = (y >= canvas.height)
   ? 0
   : y + SCALE_Y <= 0
   ? canvas.height - SCALE_Y
   : y;
  return [nx, ny];
}

const initialState = {
  pos: [[x(0), y(10)], [x(1), y(10)], [x(2), y(10)], [x(3), y(10)], [x(4), y(10)], [x(5), y(10)]],
  dir: RIGHT,
  food: createFood(),
  didCollide: false
}

function createState(reducer, initialState = {}) {
  let state = initialState;
  let listeners = [];

  function dispatch(action) {
    state = reducer(state, action);
    listeners.forEach(callback => callback(state));
  }

  function subscribe(callback) {
    listeners.push(callback);
  }

  function unsubscribe(callback) {
    listeners = listeners.filter(cb => cb !== callback);
  }

  return { dispatch, subscribe, unsubscribe };
}

function snakeReducer(state, action) {
  const { type, payload } = action;
  switch (type) {
    case "CHANGE_DIR":
      const dir = sameOrOpposite(state.dir)(payload);
      return { ...state, dir };
    case "MOVE":
      const currentSnake = nextSnake(state.pos)(state.food);
      const { pos, didCollide, didEatFood } = pipe(move, currentSnake)(state.dir);
      const food = didEatFood ? createFood() : state.food;
      return {...state, pos, didCollide, food }
    default: return state;
  }
}

function restart(event) {
  if (event.key === "Enter") run();
}

function run() {
  const { dispatch, subscribe, unsubscribe } = createState(snakeReducer, initialState);
  
  function handleKeyPress(event) {
    if (event.key === "w" || event.key === "ArrowUp") dispatch({ type: "CHANGE_DIR", payload: UP });
    if (event.key === "s" || event.key === "ArrowDown") dispatch({ type: "CHANGE_DIR", payload: DOWN });
    if (event.key === "d" || event.key === "ArrowRight") dispatch({ type: "CHANGE_DIR", payload: RIGHT });
    if (event.key === "a" || event.key === "ArrowLeft") dispatch({ type: "CHANGE_DIR", payload: LEFT });
  }

  window.removeEventListener("keydown", restart);
  window.addEventListener("keydown", handleKeyPress);

  let tick = setInterval(() => dispatch({ type: "MOVE" }), 100);

  function drawSnake(state) {
    const { didCollide, pos, food } = state;

    if (didCollide) {
      clearInterval(tick);
      unsubscribe(drawSnake);
      window.removeEventListener("keydown", handleKeyPress);

      cx.fillStyle = "#072f4f";
      cx.fillRect(0, 0, canvas.width, canvas.height);
      cx.fillStyle = "#FFFFFF";
      cx.font = '40px serif';
      cx.fillText("Press Enter to restart", x(7), y(15));

      window.addEventListener("keydown", restart);
      return;
    }

    cx.fillStyle = "#072f4f";
    cx.fillRect(0, 0, canvas.width, canvas.height); // Clear the screen

    cx.fillStyle = "#ff9951";
    pos.forEach(([x, y]) => {
      cx.fillRect(x, y, SCALE_X, SCALE_Y); // Draw the snake
    });

    cx.save();
    cx.shadowBlur = 20;
    cx.shadowColor = "#00faff";
    cx.fillStyle = "#51f6ff";
    cx.fillRect(food[0], food[1], SCALE_X, SCALE_Y); // Draw the food
    cx.restore();
  }

  subscribe(drawSnake);
}

run();