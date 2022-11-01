var five = require("johnny-five"),
  lcd,
  board = new five.Board({ port: "COM2" });
const { Led, Motor, Pin, Thermometer } = require("johnny-five");
const axios = require("axios");
let counter = 0;
let temperatura = 27;
const maxAforo = 5;

const connectionWithFirebase = async (myCounter) => {
  let res = await axios.patch(
    `https://firestore.googleapis.com/v1/projects/arquitecturaiot/databases/(default)/documents/aforo/R8TO7OKKkBxIybyfD303?updateMask.fieldPaths=assistants`,
    { fields: { assistants: { integerValue: myCounter } } }
  );
  // console.log(res.data);
};

const connectionWithFirebaseT = async (myCounter) => {
  let res = await axios.patch(
    `https://firestore.googleapis.com/v1/projects/arquitecturaiot/databases/(default)/documents/aforo/R8TO7OKKkBxIybyfD303?updateMask.fieldPaths=temp`,
    { fields: { temp: { integerValue: myCounter } } }
  );
  // console.log(res.data);
};

board.on("ready", function () {
  const ledGreen = new Led(10);
  const ledRed = new Led(13);
  const ledYellow = new Led(9);
  const thermometer = new Thermometer({
    controller: "LM35",
    pin: "A2",
  });
  const pin14 = new five.Pin({
    pin: 14,
    type: "digital",
  });
  const pin13 = new five.Pin({
    pin: 13,
  });
  new Pin({
    pin: 15,
    type: "digital",
  });
  board.repl.inject({
    ledGreen,
    ledRed,
    ledYellow,
    pin14,
  });

  const motor = new Motor({
    pins: {
      pwm: 14,
      dir: 15,
    },
  });

  // Inject the `motor` hardware into
  // the Repl instance's context;
  // allows direct command line access
  board.repl.inject({
    motor,
  });

  thermometer.on("change", () => {
    const { celsius, fahrenheit, kelvin } = thermometer;
    console.log("Thermometer");
    console.log("  celsius      : ", celsius);
    console.log("  fahrenheit   : ", fahrenheit);
    console.log("  kelvin       : ", kelvin);
    console.log("--------------------------------------");
    connectionWithFirebaseT(celsius);
    if(celsius>=50){
      ledRed.blink();
    }
  });

  // Motor Event API

  // "start" events fire when the motor is started.
  motor.on("start", () => {
    console.log(`start: ${Date.now()}`);
  });

  motor.on("stop", () => {
    console.log(`automated stop on timer: ${Date.now()}`);
  });

  motor.on("forward", () => {
    console.log(`forward: ${Date.now()}`);

    // demonstrate switching to reverse after 5 seconds
    board.wait(5000, () => {
      motor.reverse(50);
    });
  });

  motor.on("reverse", () => {
    console.log(`reverse: ${Date.now()}`);

    // demonstrate stopping after 5 seconds
    board.wait(2000, () => {
      motor.stop();
    });
  });
  lcd = new five.LCD({
    // LCD pin name  RS  EN  DB4 DB5 DB6 DB7
    // Arduino pin # 12  11   5   4  3  2
    pins: [12, 11, 5, 4, 3, 2],
    backlight: 6,
    rows: 2,
    cols: 20,
  });

  var sensorEntrada = new five.Sensor.Digital(7);
  var sensor = new five.Sensor.Digital(6);

  sensor.on("change", () => {
    if (sensor.value === 1 && counter > 0) {
      counter--;
      console.log(`Decremento a: ${counter}`);
      lcd.clear().cursor(0, 0).print(`Autos: ${counter}`);
      if (Number(counter) >= Number(maxAforo)) {
        console.log("Se llego al limite");
        ledRed.blink();
        ledYellow.off();
        ledGreen.off();
        motor.forward(255);
      } else {
        if (counter >= maxAforo / 2) {
          ledYellow.on();
          ledGreen.off();
          ledRed.off();
        } else {
          ledGreen.on();
          ledRed.off();
          ledYellow.off();
        }
      }
    }
    connectionWithFirebase(counter);
  });
  sensorEntrada.on("change", () => {
    if (sensorEntrada.value === 1 && counter < maxAforo) {
      counter++;
      console.log(`Incremeto a: ${counter}`);
      lcd.clear().cursor(0, 0).print(`Autos: ${counter}`);

      if (Number(counter) >= Number(maxAforo)) {
        console.log("Se llego al limite");
        ledRed.on();
        ledYellow.off();
        ledGreen.off();
        motor.forward(255);
      } else {
        if (counter >= maxAforo / 2) {
          ledYellow.on();
          ledGreen.off();
          ledRed.off();
        } else {
          ledGreen.on();
          ledRed.off();
          ledYellow.off();
        }
      }
    }
    connectionWithFirebase(counter);
  });

  // this.wait(3000, function() {
  //   lcd.clear().cursor(0, 0).print(`Autos: ${counter}`);
  // });

  this.repl.inject({
    lcd: lcd,
  });
});
